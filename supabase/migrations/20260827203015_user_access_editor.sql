create or replace function public.update_user_access(
  target_user uuid,
  new_first_name text,
  new_last_name text,
  new_phone text,
  new_employee_number text,
  new_status public.profile_status,
  role_ids uuid[] default '{}',
  station_ids uuid[] default '{}'
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not private.has_permission('edit_users')
    or not private.has_permission('assign_roles')
    or not private.has_permission('assign_stations') then
    raise exception 'Kullanıcı ve erişim düzenleme yetkiniz yok';
  end if;

  if target_user = (select auth.uid()) and new_status <> 'active' then
    raise exception 'Kendi hesabınızı pasife alamazsınız';
  end if;

  update public.profiles
  set first_name = left(trim(new_first_name), 80),
      last_name = left(trim(new_last_name), 80),
      phone = nullif(left(trim(new_phone), 30), ''),
      employee_number = nullif(left(trim(new_employee_number), 50), ''),
      status = new_status,
      updated_at = now()
  where id = target_user and deleted_at is null;

  if not found then
    raise exception 'Kullanıcı bulunamadı';
  end if;

  delete from public.user_roles
  where user_id = target_user
    and not (role_id = any(coalesce(role_ids, '{}'::uuid[])));

  insert into public.user_roles(user_id, role_id, assigned_by)
  select target_user, role_id, (select auth.uid())
  from (select distinct unnest(coalesce(role_ids, '{}'::uuid[])) as role_id) selected
  on conflict(user_id, role_id) do nothing;

  delete from public.user_station_assignments
  where user_id = target_user
    and not (station_id = any(coalesce(station_ids, '{}'::uuid[])));

  insert into public.user_station_assignments(user_id, station_id, assigned_by)
  select target_user, station_id, (select auth.uid())
  from (select distinct unnest(coalesce(station_ids, '{}'::uuid[])) as station_id) selected
  on conflict(user_id, station_id) do nothing;
end;
$$;

revoke all on function public.update_user_access(uuid, text, text, text, text, public.profile_status, uuid[], uuid[]) from public, anon;
grant execute on function public.update_user_access(uuid, text, text, text, text, public.profile_status, uuid[], uuid[]) to authenticated;

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_station_assignments_user_id_idx on public.user_station_assignments(user_id);
