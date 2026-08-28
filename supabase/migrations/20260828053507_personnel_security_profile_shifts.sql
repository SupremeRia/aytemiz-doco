-- Phase 1B: isolate sensitive personnel data and make shifts database-managed.
create table public.personnel_private(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text check(phone is null or char_length(phone) between 7 and 30),
  address text check(address is null or char_length(address)<=500),
  emergency_phone text check(emergency_phone is null or char_length(emergency_phone) between 7 and 30),
  national_id text check(national_id is null or national_id ~ '^[0-9]{11}$'),
  employment_start_date date,
  employment_end_date date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint employment_dates_ordered check(employment_end_date is null or employment_start_date is null or employment_end_date>=employment_start_date)
);
alter table public.personnel_private enable row level security;
revoke all on public.personnel_private from anon,authenticated;
grant select on public.personnel_private to authenticated;

insert into public.personnel_private(user_id,phone)
select id,phone from public.profiles where phone is not null
on conflict(user_id) do update set phone=excluded.phone;

-- Keep the legacy column temporarily for migration compatibility, but never expose it through Data API grants.
update public.profiles set phone=null where phone is not null;
revoke select on public.profiles from authenticated;
grant select(id,first_name,last_name,email,status,avatar_url,employee_number,deleted_at,deleted_by,created_at,updated_at) on public.profiles to authenticated;

create table public.shifts(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  starts_at time not null,
  ends_at time not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shifts enable row level security;
revoke all on public.shifts from anon,authenticated;
grant select,insert,update on public.shifts to authenticated;
insert into public.shifts(name,slug,starts_at,ends_at,sort_order) values
('Gece','night','00:00','08:00',10),('Gündüz','day','08:00','16:00',20),('Akşam','evening','16:00','00:00',30)
on conflict(slug) do update set name=excluded.name,starts_at=excluded.starts_at,ends_at=excluded.ends_at,sort_order=excluded.sort_order;

create policy personnel_private_self_read on public.personnel_private for select to authenticated
using(user_id=(select auth.uid()));
create policy personnel_private_sensitive_read on public.personnel_private for select to authenticated
using(exists(select 1 from public.user_station_assignments usa where usa.user_id=personnel_private.user_id and private.has_permission_in_scope('personnel.view_sensitive',usa.station_id,null)));
create policy shifts_active_read on public.shifts for select to authenticated using(private.is_active_user() and is_active);
create policy shifts_manage_insert on public.shifts for insert to authenticated with check(private.has_permission_in_scope('system.manage_settings'));
create policy shifts_manage_update on public.shifts for update to authenticated using(private.has_permission_in_scope('system.manage_settings')) with check(private.has_permission_in_scope('system.manage_settings'));

create index personnel_private_employment_idx on public.personnel_private(employment_start_date,employment_end_date);
create index user_roles_directory_idx on public.user_roles(user_id,role_id);

create or replace function public.get_my_profile()
returns table(id uuid,first_name text,last_name text,email text,status public.profile_status,avatar_url text,employee_number text,phone text,address text,emergency_phone text,employment_start_date date,employment_end_date date)
language sql stable security definer set search_path='' as $$
select p.id,p.first_name,p.last_name,p.email,p.status,p.avatar_url,p.employee_number,pp.phone,pp.address,pp.emergency_phone,pp.employment_start_date,pp.employment_end_date
from public.profiles p left join public.personnel_private pp on pp.user_id=p.id where p.id=(select auth.uid()) and p.deleted_at is null
$$;
revoke all on function public.get_my_profile() from public,anon;
grant execute on function public.get_my_profile() to authenticated;

create or replace function public.update_my_profile(new_phone text,new_address text,new_emergency_phone text,new_avatar_url text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_active_user() then raise exception 'Aktif kullanıcı gerekli'; end if;
 if new_phone is not null and char_length(trim(new_phone)) not between 7 and 30 then raise exception 'Geçersiz telefon'; end if;
 if new_emergency_phone is not null and char_length(trim(new_emergency_phone)) not between 7 and 30 then raise exception 'Geçersiz acil durum telefonu'; end if;
 if new_address is not null and char_length(trim(new_address))>500 then raise exception 'Adres çok uzun'; end if;
 insert into public.personnel_private(user_id,phone,address,emergency_phone,updated_by)
 values((select auth.uid()),nullif(trim(new_phone),''),nullif(trim(new_address),''),nullif(trim(new_emergency_phone),''),(select auth.uid()))
 on conflict(user_id) do update set phone=excluded.phone,address=excluded.address,emergency_phone=excluded.emergency_phone,updated_at=now(),updated_by=(select auth.uid());
 if new_avatar_url is not null then update public.profiles set avatar_url=nullif(trim(new_avatar_url),''),updated_at=now() where id=(select auth.uid()); end if;
end$$;
revoke all on function public.update_my_profile(text,text,text,text) from public,anon;
grant execute on function public.update_my_profile(text,text,text,text) to authenticated;

create or replace function public.get_station_personnel(target_station uuid)
returns table(user_id uuid,first_name text,last_name text,avatar_url text,role_name text,role_rank integer,phone text)
language sql stable security definer set search_path='' as $$
select p.id,p.first_name,p.last_name,p.avatar_url,r.name,r.role_rank,
 case when private.has_permission_in_scope('personnel.view_phone',target_station,null) then pp.phone else null end
from public.user_station_assignments usa
join public.profiles p on p.id=usa.user_id and p.status='active' and p.deleted_at is null
left join lateral(select rr.name,rr.role_rank from public.user_roles ur join public.roles rr on rr.id=ur.role_id and rr.is_active where ur.user_id=p.id order by rr.role_rank,rr.name limit 1) r on true
left join public.personnel_private pp on pp.user_id=p.id
where usa.station_id=target_station and private.has_permission_in_scope('personnel.view_directory',target_station,null)
order by coalesce(r.role_rank,1000),p.first_name,p.last_name
$$;
revoke all on function public.get_station_personnel(uuid) from public,anon;
grant execute on function public.get_station_personnel(uuid) to authenticated;

create or replace function private.sync_profile_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email is distinct from old.email then update public.profiles set email=coalesce(new.email,''),updated_at=now() where id=new.id; end if;
 return new;
end$$;
drop trigger if exists sync_profile_email_after_auth_update on auth.users;
create trigger sync_profile_email_after_auth_update after update of email on auth.users for each row execute function private.sync_profile_email();

create or replace function private.audit_personnel_private()
returns trigger language plpgsql security definer set search_path='' as $$
declare old_safe jsonb; new_safe jsonb;
begin
 old_safe=case when tg_op in('UPDATE','DELETE') then to_jsonb(old)-'national_id'||jsonb_build_object('national_id',case when old.national_id is null then null else '*******'||right(old.national_id,4) end) end;
 new_safe=case when tg_op in('INSERT','UPDATE') then to_jsonb(new)-'national_id'||jsonb_build_object('national_id',case when new.national_id is null then null else '*******'||right(new.national_id,4) end) end;
 insert into public.audit_logs(actor_user_id,action,target_type,target_id,old_value,new_value) values((select auth.uid()),lower(tg_op),'personnel_private',coalesce(new.user_id,old.user_id)::text,old_safe,new_safe);
 return case when tg_op='DELETE' then old else new end;
end$$;
create trigger audit_personnel_private after insert or update or delete on public.personnel_private for each row execute function private.audit_personnel_private();
create trigger audit_shifts after insert or update or delete on public.shifts for each row execute function private.audit_change();

comment on table public.personnel_private is 'Sensitive personnel data. Never join into broad profile queries.';
comment on column public.personnel_private.national_id is 'Optional; UI must mask and audit trigger redacts.';
