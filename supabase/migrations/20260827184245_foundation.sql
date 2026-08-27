create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.profile_status as enum ('pending','active','suspended','banned','deleted');
create type public.permission_scope as enum ('global','station','both');

create table public.regions(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,is_active boolean not null default true,created_at timestamptz not null default now());
create table public.profiles(id uuid primary key references auth.users(id) on delete restrict,first_name text not null default '',last_name text not null default '',email text not null,status public.profile_status not null default 'pending',avatar_url text,phone text,employee_number text,deleted_at timestamptz,deleted_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.roles(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,description text,is_system_role boolean not null default false,is_active boolean not null default true,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.permissions(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,description text,category text not null,scope_type public.permission_scope not null,is_system_permission boolean not null default false,is_active boolean not null default true,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.stations(id uuid primary key default gen_random_uuid(),region_id uuid references public.regions(id),city text not null,name text not null,slug text not null unique,station_code text,address text,phone text,latitude numeric(9,6),longitude numeric(9,6),opening_date date,metadata jsonb not null default '{}',is_active boolean not null default true,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.user_roles(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),role_id uuid not null references public.roles(id),assigned_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(user_id,role_id));
create table public.user_station_assignments(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),station_id uuid not null references public.stations(id),assigned_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(user_id,station_id));
create table public.role_permissions(id uuid primary key default gen_random_uuid(),role_id uuid not null references public.roles(id),permission_id uuid not null references public.permissions(id),station_id uuid references public.stations(id),granted boolean not null default true,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create unique index role_permissions_unique on public.role_permissions(role_id,permission_id,coalesce(station_id,'00000000-0000-0000-0000-000000000000'));
create table public.user_permissions(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),permission_id uuid not null references public.permissions(id),station_id uuid references public.stations(id),granted boolean not null,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create unique index user_permissions_unique on public.user_permissions(user_id,permission_id,coalesce(station_id,'00000000-0000-0000-0000-000000000000'));
create table public.system_admins(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.profiles(id),is_op boolean not null default true,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.audit_logs(id bigint generated always as identity primary key,actor_user_id uuid references auth.users(id),action text not null,target_type text not null,target_id text,station_id uuid references public.stations(id),old_value jsonb,new_value jsonb,metadata jsonb not null default '{}',created_at timestamptz not null default now());

create table public.channels(id uuid primary key default gen_random_uuid(),station_id uuid not null references public.stations(id),name text not null,slug text not null,is_active boolean not null default true,created_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(station_id,slug));
create table public.messages(id uuid primary key default gen_random_uuid(),channel_id uuid not null references public.channels(id),author_id uuid not null references public.profiles(id),body text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.announcements(id uuid primary key default gen_random_uuid(),station_id uuid references public.stations(id),title text not null,body text not null,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now());
create table public.tasks(id uuid primary key default gen_random_uuid(),station_id uuid not null references public.stations(id),title text not null,description text,status text not null default 'open',assignee_id uuid references public.profiles(id),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now());
create table public.attachments(id uuid primary key default gen_random_uuid(),station_id uuid not null references public.stations(id),owner_id uuid not null references public.profiles(id),storage_path text not null,content_type text,size_bytes bigint,created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),title text not null,body text,is_read boolean not null default false,created_at timestamptz not null default now());

create or replace function private.is_op(check_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.system_admins where user_id=check_user and is_op)$$;
create or replace function private.is_active_user(check_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=check_user and status='active' and deleted_at is null)$$;
create or replace function private.can_access_station(check_station uuid,check_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select private.is_op(check_user) or (private.is_active_user(check_user) and exists(select 1 from public.user_station_assignments where user_id=check_user and station_id=check_station))$$;
create or replace function private.has_permission(permission_slug text,check_station uuid default null,check_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
select private.is_op(check_user) or (
 private.is_active_user(check_user)
 and not exists(select 1 from public.user_permissions up join public.permissions p on p.id=up.permission_id where up.user_id=check_user and p.slug=permission_slug and up.granted=false and (up.station_id is null or up.station_id=check_station))
 and (exists(select 1 from public.user_permissions up join public.permissions p on p.id=up.permission_id where up.user_id=check_user and p.slug=permission_slug and up.granted=true and (up.station_id is null or up.station_id=check_station))
 or exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.permissions p on p.id=rp.permission_id where ur.user_id=check_user and p.slug=permission_slug and rp.granted=true and (rp.station_id is null or rp.station_id=check_station)))
)$$;
revoke all on all functions in schema private from public,anon;grant execute on all functions in schema private to authenticated;

create or replace function public.has_admin_access() returns boolean language sql stable security invoker set search_path='' as $$select private.is_op() or private.has_permission('view_all_users') or private.has_permission('create_station') or private.has_permission('create_role') or private.has_permission('create_permission') or private.has_permission('view_audit_logs')$$;
revoke all on function public.has_admin_access() from public,anon;
grant execute on function public.has_admin_access() to authenticated;

create or replace function private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,first_name,last_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),new.email);return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_profile();

create or replace function private.protect_last_op() returns trigger language plpgsql security definer set search_path='' as $$begin if old.is_op and (tg_op='DELETE' or not new.is_op) and (select count(*) from public.system_admins where is_op)=1 then raise exception 'Sistemde en az bir aktif OP kalmalıdır';end if;return case when tg_op='DELETE' then old else new end;end$$;
create trigger protect_last_op before update or delete on public.system_admins for each row execute function private.protect_last_op();

create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.audit_logs(actor_user_id,action,target_type,target_id,old_value,new_value) values(auth.uid(),lower(tg_op),tg_table_name,coalesce((case when tg_op='DELETE' then old.id else new.id end)::text,''),case when tg_op in('UPDATE','DELETE') then to_jsonb(old) end,case when tg_op in('INSERT','UPDATE') then to_jsonb(new) end);return case when tg_op='DELETE' then old else new end;end$$;
create trigger audit_system_admins after insert or update or delete on public.system_admins for each row execute function private.audit_change();
create trigger audit_roles after insert or update or delete on public.roles for each row execute function private.audit_change();
create trigger audit_permissions after insert or update or delete on public.permissions for each row execute function private.audit_change();
create trigger audit_stations after insert or update or delete on public.stations for each row execute function private.audit_change();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function private.audit_change();
create trigger audit_user_stations after insert or update or delete on public.user_station_assignments for each row execute function private.audit_change();
create trigger audit_user_permissions after insert or update or delete on public.user_permissions for each row execute function private.audit_change();
create trigger audit_role_permissions after insert or update or delete on public.role_permissions for each row execute function private.audit_change();

do $$declare t text;begin foreach t in array array['regions','profiles','roles','permissions','stations','user_roles','user_station_assignments','role_permissions','user_permissions','system_admins','audit_logs','channels','messages','announcements','tasks','attachments','notifications'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);end loop;end$$;
grant select,update on public.profiles to authenticated;
grant select,insert,update on public.roles,public.permissions,public.stations to authenticated;
grant select,insert,delete on public.user_roles,public.user_station_assignments to authenticated;
grant select,insert,update,delete on public.regions,public.role_permissions,public.user_permissions,public.system_admins,public.channels,public.messages,public.announcements,public.tasks,public.attachments,public.notifications to authenticated;

create policy profiles_self_select on public.profiles for select to authenticated using(id=(select auth.uid()) or private.has_permission('view_all_users'));
create policy roles_visible on public.roles for select to authenticated using(private.is_active_user() or private.is_op());
create policy permissions_visible on public.permissions for select to authenticated using(private.is_active_user() or private.is_op());
create policy stations_assigned_select on public.stations for select to authenticated using(private.can_access_station(id) or private.has_permission('view_all_stations'));
create policy user_roles_self_select on public.user_roles for select to authenticated using(user_id=(select auth.uid()) or private.has_permission('view_all_users'));
create policy assignments_self_select on public.user_station_assignments for select to authenticated using(user_id=(select auth.uid()) or private.has_permission('view_all_users',station_id));
create policy profiles_admin_update on public.profiles for update to authenticated using(private.has_permission('edit_users')) with check(private.has_permission('edit_users'));
create policy roles_admin_insert on public.roles for insert to authenticated with check(private.has_permission('create_role'));
create policy roles_admin_update on public.roles for update to authenticated using(private.has_permission('edit_role')) with check(private.has_permission('edit_role'));
create policy permissions_admin_insert on public.permissions for insert to authenticated with check(private.has_permission('create_permission'));
create policy permissions_admin_update on public.permissions for update to authenticated using(private.has_permission('edit_permission')) with check(private.has_permission('edit_permission'));
create policy stations_admin_insert on public.stations for insert to authenticated with check(private.has_permission('create_station'));
create policy stations_admin_update on public.stations for update to authenticated using(private.has_permission('edit_station',id)) with check(private.has_permission('edit_station',id));
create policy user_roles_admin_write on public.user_roles for insert to authenticated with check(private.has_permission('assign_roles'));
create policy user_roles_admin_delete on public.user_roles for delete to authenticated using(private.has_permission('assign_roles'));
create policy assignments_admin_write on public.user_station_assignments for insert to authenticated with check(private.has_permission('assign_stations',station_id));
create policy assignments_admin_delete on public.user_station_assignments for delete to authenticated using(private.has_permission('remove_station_assignment',station_id));
create policy regions_access on public.regions for select to authenticated using(private.is_active_user() or private.is_op());
create policy op_manage_regions on public.regions for all to authenticated using(private.has_permission('manage_system_settings')) with check(private.has_permission('manage_system_settings'));
create policy op_manage_system_admins on public.system_admins for all to authenticated using(private.is_op()) with check(private.is_op());
create policy op_view_system_admins on public.system_admins for select to authenticated using(private.is_op());
create policy audit_read on public.audit_logs for select to authenticated using(private.has_permission('view_audit_logs'));
create policy role_permissions_read on public.role_permissions for select to authenticated using(private.is_active_user());
create policy user_permissions_self_read on public.user_permissions for select to authenticated using(user_id=(select auth.uid()) or private.has_permission('view_all_users'));
create policy role_permissions_admin on public.role_permissions for all to authenticated using(private.has_permission('assign_permissions')) with check(private.has_permission('assign_permissions'));
create policy user_permissions_admin on public.user_permissions for all to authenticated using(private.has_permission('assign_permissions',station_id)) with check(private.has_permission('assign_permissions',station_id));
create policy station_channels on public.channels for select to authenticated using(private.can_access_station(station_id));
create policy station_messages on public.messages for select to authenticated using(private.can_access_station((select station_id from public.channels where id=channel_id)));
create policy station_announcements on public.announcements for select to authenticated using(station_id is null or private.can_access_station(station_id));
create policy station_tasks on public.tasks for select to authenticated using(private.can_access_station(station_id));
create policy station_attachments on public.attachments for select to authenticated using(private.can_access_station(station_id));
create policy own_notifications on public.notifications for select to authenticated using(user_id=(select auth.uid()));

comment on schema private is 'RLS authorization functions; not exposed through Data API';
comment on table public.system_admins is 'OP is separate from roles and permissions';
comment on table public.audit_logs is 'Append-only through trusted triggers; no client write grants';
