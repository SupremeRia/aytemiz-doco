-- Phase 2: private, metadata-backed media storage.
create table public.media_assets(
 id uuid primary key default gen_random_uuid(),bucket text not null,storage_path text not null,
 original_name text not null,safe_name text not null,mime_type text not null,file_extension text not null,
 size_bytes bigint not null check(size_bytes>0),width integer check(width is null or width>0),height integer check(height is null or height>0),duration_seconds numeric(10,2) check(duration_seconds is null or duration_seconds>0),
 checksum_sha256 text not null check(checksum_sha256 ~ '^[a-f0-9]{64}$'),station_id uuid references public.stations(id),owner_id uuid not null references public.profiles(id),uploaded_by uuid not null references public.profiles(id),
 parent_asset_id uuid references public.media_assets(id),version integer not null default 1 check(version>0),status text not null default 'ready' check(status in('pending','ready','rejected','deleted')),
 metadata jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,deleted_by uuid references auth.users(id),
 unique(bucket,storage_path),unique(parent_asset_id,version),
 check(bucket in('brand-assets','profile-media','operation-media','shared-content')),
 check(file_extension=lower(file_extension) and file_extension !~ '[^a-z0-9]'),
 check(jsonb_typeof(metadata)='object')
);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon,authenticated;
grant select,insert,update on public.media_assets to authenticated;
create index media_assets_station_created_idx on public.media_assets(station_id,created_at desc,id) where deleted_at is null;
create index media_assets_owner_idx on public.media_assets(owner_id,created_at desc) where deleted_at is null;
create index media_assets_parent_idx on public.media_assets(parent_asset_id,version desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('brand-assets','brand-assets',false,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml']),
('profile-media','profile-media',false,5242880,array['image/jpeg','image/png','image/webp']),
('operation-media','operation-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf']),
('shared-content','shared-content',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf','text/plain','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy media_assets_read on public.media_assets for select to authenticated using(
 deleted_at is null and private.is_active_user() and (
  owner_id=(select auth.uid()) or bucket='brand-assets' or
  (station_id is not null and (private.can_access_station(station_id) or private.has_permission_in_scope('files.view',station_id,null)))
 )
);
create policy media_assets_insert on public.media_assets for insert to authenticated with check(
 uploaded_by=(select auth.uid()) and owner_id=(select auth.uid()) and deleted_at is null and
 ((bucket='profile-media' and station_id is null) or
  (bucket='operation-media' and station_id is not null and private.has_permission_in_scope('status_posts.create',station_id,null)) or
  (bucket='shared-content' and (station_id is null or private.has_permission_in_scope('files.upload',station_id,null))) or
  (bucket='brand-assets' and private.has_permission_in_scope('system.manage_settings')))
);
create policy media_assets_update on public.media_assets for update to authenticated using(
 owner_id=(select auth.uid()) or (station_id is not null and private.has_permission_in_scope('files.edit',station_id,null)) or private.has_permission_in_scope('system.manage_settings')
) with check(uploaded_by is not null);

-- Profile paths: <user uuid>/<random uuid>.<ext>. Users can only touch their own prefix.
create policy profile_media_select on storage.objects for select to authenticated using(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_media_insert on storage.objects for insert to authenticated with check(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$');
create policy profile_media_update on storage.objects for update to authenticated using(bucket_id='profile-media' and owner_id=(select auth.uid())::text) with check(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_media_delete on storage.objects for delete to authenticated using(bucket_id='profile-media' and owner_id=(select auth.uid())::text);

-- Station paths: <station uuid>/<user uuid>/<random uuid>.<ext>.
create policy operation_media_select on storage.objects for select to authenticated using(bucket_id='operation-media' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_access_station(((storage.foldername(name))[1])::uuid));
create policy operation_media_insert on storage.objects for insert to authenticated with check(bucket_id='operation-media' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|mp4|webm|pdf)$' and (storage.foldername(name))[2]=(select auth.uid())::text and private.has_permission_in_scope('status_posts.create',((storage.foldername(name))[1])::uuid,null));
create policy operation_media_update on storage.objects for update to authenticated using(bucket_id='operation-media' and owner_id=(select auth.uid())::text) with check(bucket_id='operation-media' and (storage.foldername(name))[2]=(select auth.uid())::text);
create policy operation_media_delete on storage.objects for delete to authenticated using(bucket_id='operation-media' and (owner_id=(select auth.uid())::text or private.has_permission_in_scope('files.delete',case when (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' then ((storage.foldername(name))[1])::uuid end,null)));

create policy shared_content_select on storage.objects for select to authenticated using(bucket_id='shared-content' and ((storage.foldername(name))[1]='global' or ((storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.has_permission_in_scope('files.view',((storage.foldername(name))[1])::uuid,null))));
create policy shared_content_insert on storage.objects for insert to authenticated with check(bucket_id='shared-content' and ((storage.foldername(name))[1]='global' and private.has_permission_in_scope('files.upload')) or ((storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.has_permission_in_scope('files.upload',((storage.foldername(name))[1])::uuid,null)));
create policy shared_content_update on storage.objects for update to authenticated using(bucket_id='shared-content' and owner_id=(select auth.uid())::text) with check(bucket_id='shared-content');
create policy shared_content_delete on storage.objects for delete to authenticated using(bucket_id='shared-content' and (owner_id=(select auth.uid())::text or private.has_permission_in_scope('files.delete')));

create policy brand_assets_select on storage.objects for select to authenticated using(bucket_id='brand-assets' and private.is_active_user());
create policy brand_assets_manage_insert on storage.objects for insert to authenticated with check(bucket_id='brand-assets' and private.has_permission_in_scope('system.manage_settings'));
create policy brand_assets_manage_update on storage.objects for update to authenticated using(bucket_id='brand-assets' and private.has_permission_in_scope('system.manage_settings')) with check(bucket_id='brand-assets');
create policy brand_assets_manage_delete on storage.objects for delete to authenticated using(bucket_id='brand-assets' and private.has_permission_in_scope('system.manage_settings'));

create trigger audit_media_assets after insert or update or delete on public.media_assets for each row execute function private.audit_change();
comment on table public.media_assets is 'Authoritative metadata for private Storage objects; orphan cleanup compares this table with storage.objects.';
