insert into public.roles(name,slug,description,is_system_role) values
('Bölge Müdürü','regional_manager','Bölgesel operasyon yönetimi',true),('İstasyon Müdürü','station_manager','İstasyon yönetimi',true),('İstasyon Müdür Yardımcısı','assistant_station_manager','İstasyon yönetim desteği',true),('Market Takım Lideri','market_team_leader','Market ekibi lideri',true),('Ön Saha Takım Lideri','forecourt_team_leader','Ön saha ekibi lideri',true),('Market Satış Görevlisi','market_sales','Market satış ekibi',true),('Ön Saha Satış Görevlisi','forecourt_sales','Ön saha satış ekibi',true),('Temizlik Görevlisi','cleaning_staff','Temizlik ekibi',true),('Yıkama Görevlisi','car_wash_staff','Araç yıkama ekibi',true)
on conflict(slug) do update set name=excluded.name;

insert into public.stations(city,name,slug) values
('Kayseri','Kocasinan','kayseri-kocasinan'),('Kayseri','Melikgazi','kayseri-melikgazi'),('Trabzon','Ortahisar','trabzon-ortahisar'),('Kayseri','Argıncık','kayseri-argincik'),('Trabzon','Beşirli','trabzon-besirli'),('Erzurum','Aziziye','erzurum-aziziye'),('Erzurum','Yakutiye','erzurum-yakutiye'),('Elazığ','Elazığ','elazig-elazig') on conflict(slug) do nothing;

insert into public.permissions(name,slug,category,scope_type,is_system_permission) values
('Tüm İstasyonları Gör','view_all_stations','İstasyon Yönetimi','global',true),('İstasyon Oluştur','create_station','İstasyon Yönetimi','global',true),('İstasyon Düzenle','edit_station','İstasyon Yönetimi','both',true),('İstasyon Pasife Al','deactivate_station','İstasyon Yönetimi','both',true),('İstasyon Ayarlarını Yönet','manage_station_settings','İstasyon Yönetimi','station',true),
('Tüm Kullanıcıları Gör','view_all_users','Kullanıcı Yönetimi','global',true),('Kullanıcı Onayla','approve_users','Kullanıcı Yönetimi','both',true),('Kullanıcı Düzenle','edit_users','Kullanıcı Yönetimi','both',true),('Kullanıcı Askıya Al','suspend_users','Kullanıcı Yönetimi','both',true),('Askıyı Kaldır','unsuspend_users','Kullanıcı Yönetimi','both',true),('Kullanıcı Sil','delete_users','Kullanıcı Yönetimi','global',true),
('Rol Oluştur','create_role','Rol Yönetimi','global',true),('Rol Düzenle','edit_role','Rol Yönetimi','global',true),('Rol Pasife Al','deactivate_role','Rol Yönetimi','global',true),('Rol Ata','assign_roles','Rol Yönetimi','global',true),
('Yetki Oluştur','create_permission','Yetki Yönetimi','global',true),('Yetki Düzenle','edit_permission','Yetki Yönetimi','global',true),('Yetki Pasife Al','deactivate_permission','Yetki Yönetimi','global',true),('Yetki Ata','assign_permissions','Yetki Yönetimi','both',true),
('İstasyon Ata','assign_stations','Atama Yönetimi','both',true),('İstasyon Atamasını Kaldır','remove_station_assignment','Atama Yönetimi','both',true),
('Kanal Oluştur','create_channels','İletişim','station',true),('Kanal Düzenle','edit_channels','İletişim','station',true),('Kanal Sil','delete_channels','İletişim','station',true),('Duyuru Oluştur','create_announcements','İletişim','both',true),('Duyuru Düzenle','edit_announcements','İletişim','both',true),('Duyuru Sil','delete_announcements','İletişim','both',true),('Görevleri Yönet','manage_tasks','Operasyon','station',true),('Dosyaları Yönet','manage_files','Operasyon','station',true),('Audit Logları Gör','view_audit_logs','Sistem','global',true),('Sistem Ayarlarını Yönet','manage_system_settings','Sistem','global',true)
on conflict(slug) do update set name=excluded.name,category=excluded.category,scope_type=excluded.scope_type;

-- İlk OP kontrollü biçimde SQL Editor üzerinden oluşturulur; e-posta adresini değiştirin.
-- insert into public.system_admins(user_id,created_by)
-- select id,id from public.profiles where email='ilk.op@ornek.com';
-- update public.profiles set status='active' where email='ilk.op@ornek.com';
