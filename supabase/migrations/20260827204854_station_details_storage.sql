alter table public.stations
  add column image_url text,
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('station-images', 'station-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy station_images_admin_insert on storage.objects
for insert to authenticated
with check(bucket_id = 'station-images' and private.has_permission('edit_station'));

create policy station_images_admin_update on storage.objects
for update to authenticated
using(bucket_id = 'station-images' and private.has_permission('edit_station'))
with check(bucket_id = 'station-images' and private.has_permission('edit_station'));

create policy station_images_admin_delete on storage.objects
for delete to authenticated
using(bucket_id = 'station-images' and private.has_permission('edit_station'));

create index if not exists stations_visible_idx on public.stations(is_active, city, name)
where deleted_at is null;
