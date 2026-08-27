-- Phase 0: remove identity-based privilege escalation and tighten access boundaries.
create or replace function private.new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, first_name, last_name, email, status)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.email, ''),
    'pending'::public.profile_status
  );
  return new;
end
$$;

-- Database-owner-only, one-shot bootstrap. Intentionally not exposed through the Data API.
-- Usage is documented in README.md. Existing installations with an OP cannot run it.
create or replace function private.bootstrap_first_operator(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists(select 1 from public.system_admins where is_op) then
    raise exception 'İlk OP bootstrap işlemi daha önce tamamlanmış';
  end if;
  if not exists(select 1 from public.profiles where id = target_user) then
    raise exception 'Kullanıcı profili bulunamadı';
  end if;
  update public.profiles set status = 'active', updated_at = now() where id = target_user;
  insert into public.system_admins(user_id, is_op, created_by) values(target_user, true, target_user);
  insert into public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
  values(target_user, 'bootstrap', 'system_admins', target_user::text, jsonb_build_object('method','database_owner_one_shot'));
end
$$;
revoke all on function private.bootstrap_first_operator(uuid) from public, anon, authenticated;

create or replace function public.can(permission_slug text, check_station uuid default null)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.has_permission(permission_slug, check_station) $$;
revoke all on function public.can(text, uuid) from public, anon;
grant execute on function public.can(text, uuid) to authenticated;

-- Pending/suspended users must not see global announcements.
drop policy if exists station_announcements on public.announcements;
create policy station_announcements on public.announcements for select to authenticated
using(private.is_active_user() and (station_id is null or private.can_access_station(station_id)));

-- A station image path starts with its station UUID. Bind authorization to that UUID.
drop policy if exists station_images_admin_insert on storage.objects;
drop policy if exists station_images_admin_update on storage.objects;
drop policy if exists station_images_admin_delete on storage.objects;
create policy station_images_admin_insert on storage.objects for insert to authenticated
with check(
  bucket_id = 'station-images'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.has_permission('edit_station', case when (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' then ((storage.foldername(name))[1])::uuid end)
);
create policy station_images_admin_update on storage.objects for update to authenticated
using(bucket_id = 'station-images' and private.has_permission('edit_station', case when (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' then ((storage.foldername(name))[1])::uuid end))
with check(bucket_id = 'station-images' and private.has_permission('edit_station', case when (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' then ((storage.foldername(name))[1])::uuid end));
create policy station_images_admin_delete on storage.objects for delete to authenticated
using(bucket_id = 'station-images' and private.has_permission('edit_station', case when (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' then ((storage.foldername(name))[1])::uuid end));
