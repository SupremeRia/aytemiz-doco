create or replace function public.approve_user(
  target_user uuid,
  target_role uuid default null,
  target_station uuid default null
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.has_permission('approve_users', target_station) then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;

  update public.profiles
  set status = 'active', updated_at = now()
  where id = target_user and status = 'pending' and deleted_at is null;

  if not found then
    raise exception 'Bekleyen kullanıcı bulunamadı';
  end if;

  if target_role is not null then
    if not private.has_permission('assign_roles') then
      raise exception 'Rol atama yetkiniz yok';
    end if;
    insert into public.user_roles(user_id, role_id, assigned_by)
    values(target_user, target_role, (select auth.uid()))
    on conflict(user_id, role_id) do nothing;
  end if;

  if target_station is not null then
    if not private.has_permission('assign_stations', target_station) then
      raise exception 'İstasyon atama yetkiniz yok';
    end if;
    insert into public.user_station_assignments(user_id, station_id, assigned_by)
    values(target_user, target_station, (select auth.uid()))
    on conflict(user_id, station_id) do nothing;
  end if;
end;
$$;

revoke all on function public.approve_user(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_user(uuid, uuid, uuid) to authenticated;

create trigger audit_profiles
after update on public.profiles
for each row execute function private.audit_change();

create index if not exists profiles_status_created_at_idx on public.profiles(status, created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
