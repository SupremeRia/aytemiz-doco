-- Phase 1A: action permissions, explicit grant scopes and region assignments.
alter table public.roles add column if not exists role_rank integer not null default 100 check(role_rank between 1 and 1000);

create table public.user_region_assignments(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  region_id uuid not null references public.regions(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(user_id,region_id)
);
alter table public.user_region_assignments enable row level security;
revoke all on public.user_region_assignments from anon,authenticated;
grant select,insert,delete on public.user_region_assignments to authenticated;

alter table public.role_permissions add column if not exists region_id uuid references public.regions(id) on delete cascade;
alter table public.role_permissions add column if not exists scope_kind text not null default 'global';
alter table public.user_permissions add column if not exists region_id uuid references public.regions(id) on delete cascade;
alter table public.user_permissions add column if not exists scope_kind text not null default 'global';

update public.role_permissions set scope_kind=case when station_id is null then 'global' else 'station' end;
update public.user_permissions set scope_kind=case when station_id is null then 'global' else 'station' end;
alter table public.role_permissions add constraint role_permissions_scope_check check(
  (scope_kind='global' and station_id is null and region_id is null) or
  (scope_kind='assigned' and station_id is null and region_id is null) or
  (scope_kind='region' and station_id is null and region_id is not null) or
  (scope_kind='station' and station_id is not null and region_id is null)
);
alter table public.user_permissions add constraint user_permissions_scope_check check(
  (scope_kind='global' and station_id is null and region_id is null) or
  (scope_kind='assigned' and station_id is null and region_id is null) or
  (scope_kind='region' and station_id is null and region_id is not null) or
  (scope_kind='station' and station_id is not null and region_id is null)
);
drop index if exists public.role_permissions_unique;
drop index if exists public.user_permissions_unique;
create unique index role_permissions_scope_unique on public.role_permissions(role_id,permission_id,scope_kind,coalesce(region_id,'00000000-0000-0000-0000-000000000000'),coalesce(station_id,'00000000-0000-0000-0000-000000000000'));
create unique index user_permissions_scope_unique on public.user_permissions(user_id,permission_id,scope_kind,coalesce(region_id,'00000000-0000-0000-0000-000000000000'),coalesce(station_id,'00000000-0000-0000-0000-000000000000'));
create index user_region_assignments_user_idx on public.user_region_assignments(user_id,region_id);
create index user_region_assignments_region_idx on public.user_region_assignments(region_id,user_id);
create index stations_region_idx on public.stations(region_id) where deleted_at is null;
create index role_permissions_lookup_idx on public.role_permissions(role_id,permission_id,scope_kind);
create index user_permissions_lookup_idx on public.user_permissions(user_id,permission_id,scope_kind,granted);
create index roles_rank_idx on public.roles(role_rank,is_active);

insert into public.permissions(name,slug,category,scope_type,is_system_permission) values
('İstasyonları Gör','stations.view','İstasyonlar','station',true),('Tüm İstasyonları Gör','stations.view_all','İstasyonlar','global',true),('İstasyon Oluştur','stations.create','İstasyonlar','global',true),('İstasyon Düzenle','stations.edit','İstasyonlar','both',true),('İstasyon Pasife Al','stations.deactivate','İstasyonlar','both',true),('İstasyon Ata','stations.assign','İstasyonlar','both',true),
('Bölgeleri Gör','regions.view','Bölgeler','both',true),('Bölgeleri Yönet','regions.manage','Bölgeler','global',true),
('Personel Dizinini Gör','personnel.view_directory','Personel','both',true),('Personel Telefonunu Gör','personnel.view_phone','Personel','both',true),('Hassas Personel Bilgilerini Gör','personnel.view_sensitive','Personel','both',true),('Personel Düzenle','personnel.edit','Personel','both',true),('Çalışma Bilgilerini Yönet','personnel.manage_employment','Personel','both',true),('Personel Rolü Ata','personnel.assign_roles','Personel','both',true),
('Rolleri Gör','roles.view','Roller','global',true),('Rol Oluştur','roles.create','Roller','global',true),('Rol Düzenle','roles.edit','Roller','global',true),('Rol Yetkilerini Ata','roles.assign_permissions','Roller','global',true),('Rol Pasife Al','roles.deactivate','Roller','global',true),
('Genel Kanalı Gör','general_chat.view','Genel Kanal','station',true),('Genel Kanala Yaz','general_chat.send','Genel Kanal','station',true),('Kendi Mesajını Düzenle','general_chat.edit_own','Genel Kanal','station',true),('Kendi Mesajını Sil','general_chat.delete_own','Genel Kanal','station',true),('Genel Kanalı Yönet','general_chat.moderate','Genel Kanal','station',true),
('Duyuruları Gör','announcements.view','Duyurular','both',true),('Duyuru Oluştur','announcements.create','Duyurular','both',true),('Kendi Duyurusunu Düzenle','announcements.edit_own','Duyurular','both',true),('Tüm Duyuruları Düzenle','announcements.edit_any','Duyurular','both',true),('Duyuru Sil','announcements.delete','Duyurular','both',true),('Duyuru Sabitle','announcements.pin','Duyurular','both',true),
('Görevleri Gör','tasks.view','Görevler','station',true),('Görev Oluştur','tasks.create','Görevler','station',true),('Görev Ata','tasks.assign','Görevler','station',true),('Görev Düzenle','tasks.edit','Görevler','station',true),('Kendi Görevini Tamamla','tasks.complete_own','Görevler','station',true),('Görev İncele','tasks.review','Görevler','station',true),('Görevi Yeniden Aç','tasks.reopen','Görevler','station',true),('Görev Sil','tasks.delete','Görevler','station',true),
('Durum Gönderilerini Gör','status_posts.view','Durum Gönderileri','station',true),('Durum Gönderisi Oluştur','status_posts.create','Durum Gönderileri','station',true),('Kendi Durumunu Düzenle','status_posts.edit_own','Durum Gönderileri','station',true),('Tüm Durumları Düzenle','status_posts.edit_any','Durum Gönderileri','station',true),('Durum Gönderisi Sil','status_posts.delete','Durum Gönderileri','station',true),('Durum Gönderisi İncele','status_posts.review','Durum Gönderileri','station',true),
('Dosyaları Gör','files.view','Dosyalar','both',true),('Dosya Yükle','files.upload','Dosyalar','both',true),('Dosya Düzenle','files.edit','Dosyalar','both',true),('Dosya Değiştir','files.replace','Dosyalar','both',true),('Dosya Sil','files.delete','Dosyalar','both',true),
('Haberleri Gör','news.view','Haberler','both',true),('Haber Oluştur','news.create','Haberler','both',true),('Haber Düzenle','news.edit','Haberler','both',true),('Haber Yayınla','news.publish','Haberler','both',true),('Haber Arşivle','news.archive','Haberler','both',true),
('Bildirimlerini Gör','notifications.view_own','Bildirimler','global',true),('Bildirim Şablonlarını Yönet','notifications.manage_templates','Bildirimler','global',true),('Audit Kayıtlarını Gör','audit.view','Sistem','global',true),('Sistem Ayarlarını Yönet','system.manage_settings','Sistem','global',true),('Sistem Yöneticilerini Yönet','system.manage_operators','Sistem','global',true)
on conflict(slug) do update set name=excluded.name,category=excluded.category,scope_type=excluded.scope_type,is_system_permission=true;

-- Preserve effective access granted through legacy permissions.
with mapping(old_slug,new_slug) as (values
('view_all_stations','stations.view_all'),('create_station','stations.create'),('edit_station','stations.edit'),('deactivate_station','stations.deactivate'),('assign_stations','stations.assign'),
('view_all_users','personnel.view_directory'),('edit_users','personnel.edit'),('assign_roles','personnel.assign_roles'),('create_role','roles.create'),('edit_role','roles.edit'),('assign_permissions','roles.assign_permissions'),('deactivate_role','roles.deactivate'),
('create_announcements','announcements.create'),('edit_announcements','announcements.edit_any'),('delete_announcements','announcements.delete'),('manage_tasks','tasks.create'),('manage_tasks','tasks.assign'),('manage_tasks','tasks.edit'),('manage_tasks','tasks.review'),('manage_files','files.upload'),('manage_files','files.edit'),('manage_files','files.delete'),('view_audit_logs','audit.view'),('manage_system_settings','system.manage_settings')
)
insert into public.role_permissions(role_id,permission_id,station_id,region_id,scope_kind,granted,created_by)
select rp.role_id,np.id,rp.station_id,rp.region_id,rp.scope_kind,rp.granted,rp.created_by from public.role_permissions rp join public.permissions op on op.id=rp.permission_id join mapping m on m.old_slug=op.slug join public.permissions np on np.slug=m.new_slug
on conflict do nothing;
with mapping(old_slug,new_slug) as (values
('view_all_stations','stations.view_all'),('create_station','stations.create'),('edit_station','stations.edit'),('deactivate_station','stations.deactivate'),('assign_stations','stations.assign'),('view_all_users','personnel.view_directory'),('edit_users','personnel.edit'),('assign_roles','personnel.assign_roles'),('create_role','roles.create'),('edit_role','roles.edit'),('assign_permissions','roles.assign_permissions'),('view_audit_logs','audit.view'),('manage_system_settings','system.manage_settings')
)
insert into public.user_permissions(user_id,permission_id,station_id,region_id,scope_kind,granted,created_by)
select up.user_id,np.id,up.station_id,up.region_id,up.scope_kind,up.granted,up.created_by from public.user_permissions up join public.permissions op on op.id=up.permission_id join mapping m on m.old_slug=op.slug join public.permissions np on np.slug=m.new_slug
on conflict do nothing;

-- Default matrix. Assigned scope follows the user's station/region assignments.
with grants(role_slug,permission_slug) as (values
('regional_manager','stations.view'),('regional_manager','personnel.view_directory'),('regional_manager','personnel.view_phone'),('regional_manager','personnel.edit'),('regional_manager','personnel.assign_roles'),('regional_manager','tasks.view'),('regional_manager','tasks.create'),('regional_manager','tasks.assign'),('regional_manager','tasks.edit'),('regional_manager','tasks.review'),('regional_manager','tasks.reopen'),('regional_manager','announcements.view'),('regional_manager','announcements.create'),('regional_manager','announcements.edit_any'),('regional_manager','announcements.pin'),('regional_manager','status_posts.view'),('regional_manager','status_posts.review'),('regional_manager','files.view'),('regional_manager','files.upload'),('regional_manager','files.edit'),('regional_manager','news.view'),('regional_manager','news.create'),('regional_manager','news.publish'),
('station_manager','stations.view'),('station_manager','personnel.view_directory'),('station_manager','personnel.view_phone'),('station_manager','personnel.edit'),('station_manager','personnel.assign_roles'),('station_manager','tasks.view'),('station_manager','tasks.create'),('station_manager','tasks.assign'),('station_manager','tasks.edit'),('station_manager','tasks.review'),('station_manager','tasks.reopen'),('station_manager','announcements.view'),('station_manager','announcements.create'),('station_manager','announcements.edit_any'),('station_manager','announcements.pin'),('station_manager','status_posts.view'),('station_manager','status_posts.review'),('station_manager','files.view'),('station_manager','files.upload'),('station_manager','files.edit'),
('assistant_station_manager','stations.view'),('assistant_station_manager','personnel.view_directory'),('assistant_station_manager','personnel.view_phone'),('assistant_station_manager','tasks.view'),('assistant_station_manager','tasks.create'),('assistant_station_manager','tasks.assign'),('assistant_station_manager','tasks.edit'),('assistant_station_manager','tasks.review'),('assistant_station_manager','announcements.view'),('assistant_station_manager','announcements.create'),('assistant_station_manager','announcements.edit_own'),('assistant_station_manager','status_posts.view'),('assistant_station_manager','status_posts.review'),('assistant_station_manager','files.view'),('assistant_station_manager','files.upload'),
('market_team_leader','stations.view'),('market_team_leader','personnel.view_directory'),('market_team_leader','tasks.view'),('market_team_leader','tasks.create'),('market_team_leader','tasks.assign'),('market_team_leader','tasks.complete_own'),('market_team_leader','announcements.view'),('market_team_leader','announcements.create'),('market_team_leader','status_posts.view'),('market_team_leader','status_posts.create'),('market_team_leader','files.view'),
('forecourt_team_leader','stations.view'),('forecourt_team_leader','personnel.view_directory'),('forecourt_team_leader','tasks.view'),('forecourt_team_leader','tasks.create'),('forecourt_team_leader','tasks.assign'),('forecourt_team_leader','tasks.complete_own'),('forecourt_team_leader','announcements.view'),('forecourt_team_leader','announcements.create'),('forecourt_team_leader','status_posts.view'),('forecourt_team_leader','status_posts.create'),('forecourt_team_leader','files.view'),
('market_sales','stations.view'),('market_sales','personnel.view_directory'),('market_sales','general_chat.view'),('market_sales','general_chat.send'),('market_sales','general_chat.edit_own'),('market_sales','tasks.view'),('market_sales','tasks.complete_own'),('market_sales','announcements.view'),('market_sales','status_posts.view'),('market_sales','status_posts.create'),('market_sales','status_posts.edit_own'),('market_sales','files.view'),
('forecourt_sales','stations.view'),('forecourt_sales','personnel.view_directory'),('forecourt_sales','general_chat.view'),('forecourt_sales','general_chat.send'),('forecourt_sales','general_chat.edit_own'),('forecourt_sales','tasks.view'),('forecourt_sales','tasks.complete_own'),('forecourt_sales','announcements.view'),('forecourt_sales','status_posts.view'),('forecourt_sales','status_posts.create'),('forecourt_sales','status_posts.edit_own'),('forecourt_sales','files.view'),
('cleaning_staff','stations.view'),('cleaning_staff','personnel.view_directory'),('cleaning_staff','general_chat.view'),('cleaning_staff','general_chat.send'),('cleaning_staff','tasks.view'),('cleaning_staff','tasks.complete_own'),('cleaning_staff','announcements.view'),('cleaning_staff','status_posts.view'),('cleaning_staff','status_posts.create'),('cleaning_staff','files.view'),
('car_wash_staff','stations.view'),('car_wash_staff','personnel.view_directory'),('car_wash_staff','general_chat.view'),('car_wash_staff','general_chat.send'),('car_wash_staff','tasks.view'),('car_wash_staff','tasks.complete_own'),('car_wash_staff','announcements.view'),('car_wash_staff','status_posts.view'),('car_wash_staff','status_posts.create'),('car_wash_staff','files.view')
)
insert into public.role_permissions(role_id,permission_id,scope_kind,granted)
select r.id,p.id,'assigned',true from grants g join public.roles r on r.slug=g.role_slug join public.permissions p on p.slug=g.permission_slug
on conflict do nothing;

update public.roles set role_rank=case slug when 'regional_manager' then 10 when 'station_manager' then 20 when 'assistant_station_manager' then 30 when 'market_team_leader' then 40 when 'forecourt_team_leader' then 50 when 'market_sales' then 60 when 'forecourt_sales' then 70 when 'cleaning_staff' then 80 when 'car_wash_staff' then 90 else role_rank end;

create or replace function private.permission_scope_matches(scope_kind text,scope_station uuid,scope_region uuid,check_station uuid,check_region uuid,check_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
select case scope_kind
 when 'global' then true
 when 'station' then check_station is not null and scope_station=check_station
 when 'region' then coalesce(check_region,(select region_id from public.stations where id=check_station))=scope_region
 when 'assigned' then
   (check_station is not null and exists(select 1 from public.user_station_assignments where user_id=check_user and station_id=check_station))
   or (coalesce(check_region,(select region_id from public.stations where id=check_station)) is not null and exists(select 1 from public.user_region_assignments where user_id=check_user and region_id=coalesce(check_region,(select region_id from public.stations where id=check_station))))
 else false end
$$;

create or replace function private.has_permission_in_scope(permission_slug text,check_station uuid default null,check_region uuid default null,check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
select private.is_op(check_user) or (
 private.is_active_user(check_user)
 and not exists(select 1 from public.user_permissions up join public.permissions p on p.id=up.permission_id where up.user_id=check_user and p.slug=permission_slug and p.is_active and not up.granted and private.permission_scope_matches(up.scope_kind,up.station_id,up.region_id,check_station,check_region,check_user))
 and (
  exists(select 1 from public.user_permissions up join public.permissions p on p.id=up.permission_id where up.user_id=check_user and p.slug=permission_slug and p.is_active and up.granted and private.permission_scope_matches(up.scope_kind,up.station_id,up.region_id,check_station,check_region,check_user))
  or exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id and r.is_active join public.role_permissions rp on rp.role_id=ur.role_id join public.permissions p on p.id=rp.permission_id where ur.user_id=check_user and p.slug=permission_slug and p.is_active and rp.granted and private.permission_scope_matches(rp.scope_kind,rp.station_id,rp.region_id,check_station,check_region,check_user))
 )
)$$;

create or replace function private.has_permission(permission_slug text,check_station uuid default null,check_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select private.has_permission_in_scope(permission_slug,check_station,null,check_user)$$;
revoke all on function private.permission_scope_matches(text,uuid,uuid,uuid,uuid,uuid) from public,anon;
revoke all on function private.has_permission_in_scope(text,uuid,uuid,uuid) from public,anon;
grant execute on function private.permission_scope_matches(text,uuid,uuid,uuid,uuid,uuid) to authenticated;
grant execute on function private.has_permission_in_scope(text,uuid,uuid,uuid) to authenticated;

create or replace function public.can(permission_slug text,check_station uuid default null)
returns boolean language sql stable security invoker set search_path='' as $$select private.has_permission_in_scope(permission_slug,check_station,null)$$;
create or replace function public.can_in_scope(permission_slug text,check_station uuid default null,check_region uuid default null)
returns boolean language sql stable security invoker set search_path='' as $$select private.has_permission_in_scope(permission_slug,check_station,check_region)$$;
revoke all on function public.can(text,uuid) from public,anon;
revoke all on function public.can_in_scope(text,uuid,uuid) from public,anon;
grant execute on function public.can(text,uuid) to authenticated;
grant execute on function public.can_in_scope(text,uuid,uuid) to authenticated;

create or replace function public.get_effective_permissions(check_station uuid default null,check_region uuid default null)
returns table(permission_slug text,allowed boolean) language sql stable security invoker set search_path='' as $$
select p.slug,private.has_permission_in_scope(p.slug,check_station,check_region) from public.permissions p where p.is_active order by p.slug
$$;
revoke all on function public.get_effective_permissions(uuid,uuid) from public,anon;
grant execute on function public.get_effective_permissions(uuid,uuid) to authenticated;

create policy region_assignments_self_read on public.user_region_assignments for select to authenticated using(user_id=(select auth.uid()) or private.has_permission_in_scope('personnel.view_directory',null,region_id));
create policy region_assignments_manage_insert on public.user_region_assignments for insert to authenticated with check(private.has_permission_in_scope('stations.assign',null,region_id));
create policy region_assignments_manage_delete on public.user_region_assignments for delete to authenticated using(private.has_permission_in_scope('stations.assign',null,region_id));

drop policy if exists stations_assigned_select on public.stations;
create policy stations_scoped_select on public.stations for select to authenticated using(
  private.can_access_station(id) or private.has_permission_in_scope('stations.view',id,region_id) or private.has_permission_in_scope('stations.view_all') or private.has_permission('view_all_stations')
);

create trigger audit_user_regions after insert or update or delete on public.user_region_assignments for each row execute function private.audit_change();

drop policy if exists role_permissions_admin on public.role_permissions;
create policy role_permissions_admin on public.role_permissions for all to authenticated
using(private.has_permission_in_scope('roles.assign_permissions') or private.has_permission('assign_permissions'))
with check(private.has_permission_in_scope('roles.assign_permissions') or private.has_permission('assign_permissions'));
drop policy if exists user_permissions_admin on public.user_permissions;
create policy user_permissions_admin on public.user_permissions for all to authenticated
using(private.has_permission_in_scope('roles.assign_permissions',station_id,region_id) or private.has_permission('assign_permissions',station_id))
with check(private.has_permission_in_scope('roles.assign_permissions',station_id,region_id) or private.has_permission('assign_permissions',station_id));

create or replace function public.replace_role_permissions(target_role uuid,permission_ids uuid[])
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not (private.has_permission_in_scope('roles.assign_permissions') or private.has_permission('assign_permissions')) then raise exception 'Yetkiniz bulunmuyor'; end if;
 if not exists(select 1 from public.roles where id=target_role) then raise exception 'Rol bulunamadı'; end if;
 delete from public.role_permissions where role_id=target_role and scope_kind='assigned';
 insert into public.role_permissions(role_id,permission_id,scope_kind,granted,created_by)
 select target_role,p.id,'assigned',true,(select auth.uid()) from public.permissions p where p.id=any(coalesce(permission_ids,'{}'::uuid[])) and p.is_active
 on conflict do nothing;
end$$;
revoke all on function public.replace_role_permissions(uuid,uuid[]) from public,anon;
grant execute on function public.replace_role_permissions(uuid,uuid[]) to authenticated;

create or replace function public.set_user_permission(target_user uuid,target_permission uuid,grant_value boolean,target_scope text default 'global',target_station uuid default null,target_region uuid default null)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not (private.has_permission_in_scope('roles.assign_permissions',target_station,target_region) or private.has_permission('assign_permissions',target_station)) then raise exception 'Yetkiniz bulunmuyor'; end if;
 if target_scope not in('global','assigned','region','station') then raise exception 'Geçersiz kapsam'; end if;
 delete from public.user_permissions where user_id=target_user and permission_id=target_permission and scope_kind=target_scope and coalesce(station_id,'00000000-0000-0000-0000-000000000000')=coalesce(target_station,'00000000-0000-0000-0000-000000000000') and coalesce(region_id,'00000000-0000-0000-0000-000000000000')=coalesce(target_region,'00000000-0000-0000-0000-000000000000');
 insert into public.user_permissions(user_id,permission_id,scope_kind,station_id,region_id,granted,created_by) values(target_user,target_permission,target_scope,target_station,target_region,grant_value,(select auth.uid()));
end$$;
revoke all on function public.set_user_permission(uuid,uuid,boolean,text,uuid,uuid) from public,anon;
grant execute on function public.set_user_permission(uuid,uuid,boolean,text,uuid,uuid) to authenticated;

create or replace function public.has_admin_access() returns boolean language sql stable security invoker set search_path='' as $$select private.is_op() or private.has_permission_in_scope('personnel.view_directory') or private.has_permission_in_scope('stations.create') or private.has_permission_in_scope('roles.view') or private.has_permission_in_scope('audit.view') or private.has_permission('view_all_users') or private.has_permission('create_station') or private.has_permission('view_audit_logs')$$;
