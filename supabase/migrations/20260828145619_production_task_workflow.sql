-- Phase 3: permission-scoped task workflow, evidence, history and notifications.
alter table public.tasks add column if not exists priority text not null default 'normal';
alter table public.tasks add column if not exists due_date timestamptz;
alter table public.tasks add column if not exists shift_id uuid references public.shifts(id);
alter table public.tasks add column if not exists evidence_required boolean not null default false;
alter table public.tasks add column if not exists evidence_type text not null default 'none';
alter table public.tasks add column if not exists review_required boolean not null default false;
alter table public.tasks add column if not exists started_at timestamptz;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.tasks add column if not exists deleted_at timestamptz;
alter table public.tasks add column if not exists deleted_by uuid references auth.users(id);
alter table public.tasks add column if not exists version integer not null default 1;
update public.tasks set status='assigned' where status='open';
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check(status in('draft','assigned','in_progress','awaiting_review','completed','rejected','cancelled'));
alter table public.tasks add constraint tasks_priority_check check(priority in('normal','important','urgent'));
alter table public.tasks add constraint tasks_evidence_type_check check(evidence_type in('none','photo','description','photo_and_description'));
alter table public.tasks add constraint tasks_evidence_consistent check(evidence_required or evidence_type='none');

create table public.task_assignees(
 id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks(id) on delete cascade,user_id uuid not null references public.profiles(id),assigned_at timestamptz not null default now(),assigned_by uuid not null references public.profiles(id),status text not null default 'assigned' check(status in('assigned','in_progress','submitted','completed','rejected','cancelled')),started_at timestamptz,completed_at timestamptz,unique(task_id,user_id)
);
create table public.task_evidence(
 id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks(id) on delete cascade,submitted_by uuid not null references public.profiles(id),description text,completed_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),edited_at timestamptz,version integer not null default 1,deleted_at timestamptz,deleted_by uuid references auth.users(id)
);
create table public.task_evidence_media(
 evidence_id uuid not null references public.task_evidence(id) on delete cascade,media_asset_id uuid not null references public.media_assets(id),sort_order integer not null default 0,primary key(evidence_id,media_asset_id)
);
create table public.task_events(
 id bigint generated always as identity primary key,task_id uuid not null references public.tasks(id) on delete cascade,actor_id uuid references public.profiles(id),event_type text not null check(event_type in('created','assigned','unassigned','started','evidence_added','submitted','approved','rejected','edited','cancelled','reopened')),metadata jsonb not null default '{}',created_at timestamptz not null default now(),check(jsonb_typeof(metadata)='object')
);
do $$declare i text;begin foreach i in array array['task_assignees','task_evidence','task_evidence_media','task_events'] loop execute format('alter table public.%I enable row level security',i);execute format('revoke all on public.%I from anon,authenticated',i);execute format('grant select on public.%I to authenticated',i);end loop;end$$;
revoke insert,update,delete on public.tasks from authenticated;

alter table public.notifications add column if not exists type text not null default 'general';
alter table public.notifications add column if not exists entity_type text;
alter table public.notifications add column if not exists entity_id uuid;
alter table public.notifications add column if not exists station_id uuid references public.stations(id);
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists severity text not null default 'normal';
alter table public.notifications add column if not exists deduplication_key text;
create unique index notifications_dedup_idx on public.notifications(user_id,deduplication_key) where deduplication_key is not null;

insert into public.permissions(name,slug,category,scope_type,is_system_permission) values
('Görev Tamamla','tasks.complete','Görevler','station',true),('Görev Kanıtını Geç Düzenle','tasks.override_edit','Görevler','station',true)
on conflict(slug) do update set name=excluded.name,category=excluded.category,scope_type=excluded.scope_type,is_system_permission=true;
with role_slugs(slug) as(values('regional_manager'),('station_manager'),('assistant_station_manager'))
insert into public.role_permissions(role_id,permission_id,scope_kind,granted)
select r.id,p.id,'assigned',true from role_slugs x join public.roles r on r.slug=x.slug cross join public.permissions p where p.slug='tasks.override_edit' on conflict do nothing;
with role_slugs(slug) as(values('regional_manager'),('station_manager'),('assistant_station_manager'),('market_team_leader'),('forecourt_team_leader'),('market_sales'),('forecourt_sales'),('cleaning_staff'),('car_wash_staff'))
insert into public.role_permissions(role_id,permission_id,scope_kind,granted)
select r.id,p.id,'assigned',true from role_slugs x join public.roles r on r.slug=x.slug cross join public.permissions p where p.slug='tasks.complete' on conflict do nothing;

create index tasks_station_cursor_idx on public.tasks(station_id,created_at desc,id desc) where deleted_at is null;
create index tasks_due_idx on public.tasks(due_date,status) where deleted_at is null and status not in('completed','cancelled');
create index tasks_status_idx on public.tasks(station_id,status,created_at desc) where deleted_at is null;
create index task_assignees_user_idx on public.task_assignees(user_id,status,task_id);
create index task_assignees_task_idx on public.task_assignees(task_id,user_id);
create index task_evidence_task_idx on public.task_evidence(task_id,created_at desc) where deleted_at is null;
create index task_events_task_idx on public.task_events(task_id,created_at,id);

create or replace function private.can_view_task(check_task uuid,check_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.tasks t where t.id=check_task and t.deleted_at is null and (private.has_permission_in_scope('tasks.view',t.station_id,null,check_user) or exists(select 1 from public.task_assignees ta where ta.task_id=t.id and ta.user_id=check_user)))
$$;
revoke all on function private.can_view_task(uuid,uuid) from public,anon;
grant execute on function private.can_view_task(uuid,uuid) to authenticated;

drop policy if exists station_tasks on public.tasks;
create policy tasks_scoped_read on public.tasks for select to authenticated using(deleted_at is null and private.can_view_task(id));
create policy task_assignees_read on public.task_assignees for select to authenticated using(private.can_view_task(task_id));
create policy task_evidence_read on public.task_evidence for select to authenticated using(deleted_at is null and private.can_view_task(task_id));
create policy task_evidence_media_read on public.task_evidence_media for select to authenticated using(exists(select 1 from public.task_evidence e where e.id=evidence_id and private.can_view_task(e.task_id)));
create policy task_events_read on public.task_events for select to authenticated using(private.can_view_task(task_id));
create policy task_media_asset_insert on public.media_assets for insert to authenticated with check(bucket='operation-media' and owner_id=(select auth.uid()) and uploaded_by=(select auth.uid()) and storage_path like 'tasks/%' and station_id is not null and exists(select 1 from public.tasks t join public.task_assignees ta on ta.task_id=t.id where t.id=(split_part(storage_path,'/',3))::uuid and t.station_id=media_assets.station_id and ta.user_id=(select auth.uid()) and t.deleted_at is null));

create or replace function private.task_notify(target_user uuid,target_task uuid,event_name text,title_text text,body_text text,dedup_key text) returns void language plpgsql security definer set search_path='' as $$
declare task_station uuid; station_slug text; begin
 select t.station_id,s.slug into task_station,station_slug from public.tasks t join public.stations s on s.id=t.station_id where t.id=target_task;
 insert into public.notifications(user_id,title,body,type,entity_type,entity_id,station_id,action_url,severity,deduplication_key)
 values(target_user,title_text,body_text,event_name,'task',target_task,task_station,'/station/'||station_slug||'/tasks/'||target_task,case when event_name='task_rejected' then 'important' else 'normal' end,dedup_key)
 on conflict(user_id,deduplication_key) where deduplication_key is not null do nothing;
end$$;
revoke all on function private.task_notify(uuid,uuid,text,text,text,text) from public,anon,authenticated;

create or replace function public.list_tasks(target_station uuid default null,mine_only boolean default false,status_filter text default null,search_text text default null,cursor_created timestamptz default null,cursor_id uuid default null,page_size integer default 20)
returns table(id uuid,station_id uuid,station_name text,station_slug text,title text,description text,priority text,status text,effective_status text,due_group text,due_date timestamptz,shift_name text,shift_window text,evidence_required boolean,evidence_type text,review_required boolean,created_by uuid,creator_name text,created_at timestamptz,assignees jsonb)
language sql stable security definer set search_path='' as $$
select t.id,t.station_id,s.name,s.slug,t.title,t.description,t.priority,t.status,
 case when t.due_date<now() and t.status not in('completed','cancelled') then 'overdue' else t.status end,
 case when t.status='completed' then 'completed' when t.due_date<now() then 'overdue' when (t.due_date at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date then 'today' else 'upcoming' end,
 t.due_date,sh.name,case when sh.id is null then null else to_char(sh.starts_at,'HH24:MI')||'–'||to_char(sh.ends_at,'HH24:MI') end,t.evidence_required,t.evidence_type,t.review_required,t.created_by,trim(cp.first_name||' '||cp.last_name),t.created_at,
 coalesce((select jsonb_agg(jsonb_build_object('id',ap.id,'name',trim(ap.first_name||' '||ap.last_name),'status',ta.status) order by ap.first_name,ap.last_name) from public.task_assignees ta join public.profiles ap on ap.id=ta.user_id where ta.task_id=t.id),'[]'::jsonb)
from public.tasks t join public.stations s on s.id=t.station_id left join public.shifts sh on sh.id=t.shift_id join public.profiles cp on cp.id=t.created_by
where t.deleted_at is null and (target_station is null or t.station_id=target_station)
and private.can_view_task(t.id)
and (not mine_only or exists(select 1 from public.task_assignees ta where ta.task_id=t.id and ta.user_id=(select auth.uid())))
and (status_filter is null or status_filter='' or (status_filter='overdue' and t.due_date<now() and t.status not in('completed','cancelled')) or (status_filter<>'overdue' and t.status=status_filter))
and (search_text is null or search_text='' or t.title ilike '%'||search_text||'%' or coalesce(t.description,'') ilike '%'||search_text||'%' or exists(select 1 from public.task_assignees ta join public.profiles p on p.id=ta.user_id where ta.task_id=t.id and trim(p.first_name||' '||p.last_name) ilike '%'||search_text||'%'))
and (cursor_created is null or (t.created_at,t.id)<(cursor_created,coalesce(cursor_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
order by t.created_at desc,t.id desc limit least(greatest(page_size,1),50)
$$;
revoke all on function public.list_tasks(uuid,boolean,text,text,timestamptz,uuid,integer) from public,anon;
grant execute on function public.list_tasks(uuid,boolean,text,text,timestamptz,uuid,integer) to authenticated;

create or replace function public.get_task_detail(target_task uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin if not private.can_view_task(target_task) then return null;end if;
select jsonb_build_object('task',jsonb_build_object('id',t.id,'station_id',t.station_id,'station_name',s.name,'station_slug',s.slug,'title',t.title,'description',t.description,'priority',t.priority,'status',t.status,'effective_status',case when t.due_date<now() and t.status not in('completed','cancelled') then 'overdue' else t.status end,'due_date',t.due_date,'shift_name',sh.name,'shift_window',case when sh.id is null then null else to_char(sh.starts_at,'HH24:MI')||'–'||to_char(sh.ends_at,'HH24:MI') end,'evidence_required',t.evidence_required,'evidence_type',t.evidence_type,'review_required',t.review_required,'created_at',t.created_at,'creator_name',trim(cp.first_name||' '||cp.last_name)),
'assignees',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',trim(p.first_name||' '||p.last_name),'status',ta.status,'is_me',p.id=(select auth.uid())) order by p.first_name,p.last_name) from public.task_assignees ta join public.profiles p on p.id=ta.user_id where ta.task_id=t.id),'[]'::jsonb),
'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'type',e.event_type,'actor_name',coalesce(trim(p.first_name||' '||p.last_name),'Sistem'),'metadata',e.metadata,'created_at',e.created_at) order by e.created_at,e.id) from public.task_events e left join public.profiles p on p.id=e.actor_id where e.task_id=t.id),'[]'::jsonb),
'evidence',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'description',e.description,'completed_at',e.completed_at,'created_at',e.created_at,'edited_at',e.edited_at,'submitted_by',e.submitted_by,'submitter_name',trim(p.first_name||' '||p.last_name),'can_edit',(e.submitted_by=(select auth.uid()) and now()<=e.created_at+interval '60 minutes') or private.has_permission_in_scope('tasks.override_edit',t.station_id)) order by e.created_at desc) from public.task_evidence e join public.profiles p on p.id=e.submitted_by where e.task_id=t.id and e.deleted_at is null),'[]'::jsonb),
'can_start',exists(select 1 from public.task_assignees ta where ta.task_id=t.id and ta.user_id=(select auth.uid())) and t.status in('assigned','rejected'),
'can_complete',exists(select 1 from public.task_assignees ta where ta.task_id=t.id and ta.user_id=(select auth.uid())) and t.status in('assigned','in_progress','rejected'),
'can_review',t.status='awaiting_review' and private.has_permission_in_scope('tasks.review',t.station_id)) into result
from public.tasks t join public.stations s on s.id=t.station_id left join public.shifts sh on sh.id=t.shift_id join public.profiles cp on cp.id=t.created_by where t.id=target_task and t.deleted_at is null;return result;end$$;
revoke all on function public.get_task_detail(uuid) from public,anon;grant execute on function public.get_task_detail(uuid) to authenticated;

create or replace function public.create_task(target_station uuid,task_title text,task_description text,task_priority text,target_due_date timestamptz,target_shift uuid,assignee_ids uuid[],requires_evidence boolean default false,required_evidence_type text default 'none',requires_review boolean default false,save_as_draft boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid; assignee uuid; begin
 if not private.has_permission_in_scope('tasks.create',target_station) then raise exception 'Görev oluşturma yetkiniz yok'; end if;
 if not save_as_draft and not private.has_permission_in_scope('tasks.assign',target_station) then raise exception 'Görev atama yetkiniz yok'; end if;
 if char_length(trim(task_title)) not between 3 and 160 or char_length(coalesce(task_description,''))>4000 then raise exception 'Görev alanlarını kontrol edin'; end if;
 if task_priority not in('normal','important','urgent') or required_evidence_type not in('none','photo','description','photo_and_description') then raise exception 'Geçersiz görev seçeneği'; end if;
 if requires_evidence and required_evidence_type='none' then raise exception 'Kanıt türü gerekli'; end if;
 if not requires_evidence then required_evidence_type='none'; end if;
 if not save_as_draft and cardinality(coalesce(assignee_ids,'{}'))=0 then raise exception 'En az bir personel seçin'; end if;
 if exists(select 1 from unnest(coalesce(assignee_ids,'{}')) u where not exists(select 1 from public.user_station_assignments usa join public.profiles p on p.id=usa.user_id where usa.station_id=target_station and usa.user_id=u and p.status='active' and p.deleted_at is null)) then raise exception 'Seçilen personel istasyonda aktif değil'; end if;
 insert into public.tasks(station_id,title,description,priority,status,due_date,shift_id,evidence_required,evidence_type,review_required,created_by)
 values(target_station,trim(task_title),nullif(trim(task_description),''),task_priority,case when save_as_draft then 'draft' else 'assigned' end,target_due_date,target_shift,requires_evidence,required_evidence_type,requires_review,(select auth.uid())) returning id into new_id;
 insert into public.task_events(task_id,actor_id,event_type,metadata) values(new_id,(select auth.uid()),'created',jsonb_build_object('draft',save_as_draft));
 foreach assignee in array coalesce(assignee_ids,'{}') loop
  insert into public.task_assignees(task_id,user_id,assigned_by) values(new_id,assignee,(select auth.uid()));
  insert into public.task_events(task_id,actor_id,event_type,metadata) values(new_id,(select auth.uid()),'assigned',jsonb_build_object('user_id',assignee));
  perform private.task_notify(assignee,new_id,'task_assigned','Yeni görev atandı',trim(task_title),'task_assigned:'||new_id||':'||assignee);
 end loop; return new_id;
end$$;
revoke all on function public.create_task(uuid,text,text,text,timestamptz,uuid,uuid[],boolean,text,boolean,boolean) from public,anon;
grant execute on function public.create_task(uuid,text,text,text,timestamptz,uuid,uuid[],boolean,text,boolean,boolean) to authenticated;

create or replace function public.start_task(target_task uuid) returns void language plpgsql security definer set search_path='' as $$
declare current_station uuid;begin select station_id into current_station from public.tasks where id=target_task and deleted_at is null and status in('assigned','rejected');if current_station is null then raise exception 'Görev başlatılamaz';end if;if not exists(select 1 from public.task_assignees where task_id=target_task and user_id=(select auth.uid())) then raise exception 'Bu görev size atanmamış';end if;if not private.has_permission_in_scope('tasks.complete',current_station) and not private.has_permission_in_scope('tasks.complete_own',current_station) then raise exception 'Yetkiniz yok';end if;update public.tasks set status='in_progress',started_at=coalesce(started_at,now()),updated_at=now(),version=version+1 where id=target_task;update public.task_assignees set status='in_progress',started_at=coalesce(started_at,now()) where task_id=target_task and user_id=(select auth.uid());insert into public.task_events(task_id,actor_id,event_type) values(target_task,(select auth.uid()),'started');end$$;
revoke all on function public.start_task(uuid) from public,anon;grant execute on function public.start_task(uuid) to authenticated;

create or replace function public.complete_task(target_task uuid,evidence_description text,target_completed_at timestamptz default now(),asset_ids uuid[] default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare t public.tasks; evidence_id uuid; creator uuid;begin select * into t from public.tasks where id=target_task and deleted_at is null for update;if t.id is null or t.status not in('assigned','in_progress','rejected') then raise exception 'Görev tamamlanamaz';end if;if not exists(select 1 from public.task_assignees where task_id=target_task and user_id=(select auth.uid())) then raise exception 'Bu görev size atanmamış';end if;if not (private.has_permission_in_scope('tasks.complete',t.station_id) or private.has_permission_in_scope('tasks.complete_own',t.station_id)) then raise exception 'Yetkiniz yok';end if;if t.evidence_required and t.evidence_type in('description','photo_and_description') and nullif(trim(evidence_description),'') is null then raise exception 'Açıklama kanıtı zorunlu';end if;if t.evidence_required and t.evidence_type in('photo','photo_and_description') and cardinality(coalesce(asset_ids,'{}'))=0 then raise exception 'Fotoğraf kanıtı zorunlu';end if;if exists(select 1 from unnest(coalesce(asset_ids,'{}')) a where not exists(select 1 from public.media_assets m where m.id=a and m.owner_id=(select auth.uid()) and m.station_id=t.station_id and m.bucket='operation-media' and m.deleted_at is null)) then raise exception 'Geçersiz medya kanıtı';end if;if target_completed_at>now()+interval '5 minutes' or target_completed_at<now()-interval '24 hours' then raise exception 'Tamamlanma zamanı geçersiz';end if;insert into public.task_evidence(task_id,submitted_by,description,completed_at) values(target_task,(select auth.uid()),nullif(trim(evidence_description),''),target_completed_at) returning id into evidence_id;insert into public.task_evidence_media(evidence_id,media_asset_id,sort_order) select evidence_id,a,row_number() over() from unnest(coalesce(asset_ids,'{}')) a;update public.task_assignees set status=case when t.review_required then 'submitted' else 'completed' end,completed_at=target_completed_at where task_id=target_task and user_id=(select auth.uid());if not exists(select 1 from public.task_assignees where task_id=target_task and status not in('completed','submitted')) then update public.tasks set status=case when t.review_required then 'awaiting_review' else 'completed' end,completed_at=target_completed_at,updated_at=now(),version=version+1 where id=target_task;end if;insert into public.task_events(task_id,actor_id,event_type,metadata) values(target_task,(select auth.uid()),'submitted',jsonb_build_object('evidence_id',evidence_id,'media_count',cardinality(coalesce(asset_ids,'{}'))));select created_by into creator from public.tasks where id=target_task;perform private.task_notify(creator,target_task,case when t.review_required then 'task_review' else 'task_completed' end,case when t.review_required then 'Görev inceleme bekliyor' else 'Görev tamamlandı' end,t.title,(case when t.review_required then 'task_review:' else 'task_completed:' end)||target_task);return evidence_id;end$$;
revoke all on function public.complete_task(uuid,text,timestamptz,uuid[]) from public,anon;grant execute on function public.complete_task(uuid,text,timestamptz,uuid[]) to authenticated;

create or replace function public.review_task(target_task uuid,decision text,rejection_reason text default null) returns void language plpgsql security definer set search_path='' as $$
declare t public.tasks; assignee uuid;begin select * into t from public.tasks where id=target_task and deleted_at is null for update;if t.id is null or t.status<>'awaiting_review' then raise exception 'Görev inceleme beklemiyor';end if;if not private.has_permission_in_scope('tasks.review',t.station_id) then raise exception 'İnceleme yetkiniz yok';end if;if decision not in('approve','reject') then raise exception 'Geçersiz karar';end if;if decision='reject' and nullif(trim(rejection_reason),'') is null then raise exception 'Ret sebebi zorunlu';end if;update public.tasks set status=case when decision='approve' then 'completed' else 'rejected' end,updated_at=now(),version=version+1 where id=target_task;update public.task_assignees set status=case when decision='approve' then 'completed' else 'rejected' end where task_id=target_task;insert into public.task_events(task_id,actor_id,event_type,metadata) values(target_task,(select auth.uid()),case when decision='approve' then 'approved' else 'rejected' end,jsonb_build_object('reason',case when decision='reject' then trim(rejection_reason) else null end));for assignee in select user_id from public.task_assignees where task_id=target_task loop perform private.task_notify(assignee,target_task,case when decision='approve' then 'task_approved' else 'task_rejected' end,case when decision='approve' then 'Görev onaylandı' else 'Görev reddedildi' end,case when decision='approve' then t.title else trim(rejection_reason) end,(case when decision='approve' then 'task_approved:' else 'task_rejected:' end)||target_task||':'||assignee);end loop;end$$;
revoke all on function public.review_task(uuid,text,text) from public,anon;grant execute on function public.review_task(uuid,text,text) to authenticated;

create or replace function public.edit_task_evidence(target_evidence uuid,new_description text,new_completed_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare e public.task_evidence;t public.tasks;begin select * into e from public.task_evidence where id=target_evidence and deleted_at is null for update;select * into t from public.tasks where id=e.task_id;if e.id is null then raise exception 'Kanıt bulunamadı';end if;if not ((e.submitted_by=(select auth.uid()) and now()<=e.created_at+interval '60 minutes') or private.has_permission_in_scope('tasks.override_edit',t.station_id)) then raise exception 'Düzenleme süresi doldu';end if;update public.task_evidence set description=nullif(trim(new_description),''),completed_at=new_completed_at,updated_at=now(),edited_at=now(),version=version+1 where id=target_evidence;insert into public.task_events(task_id,actor_id,event_type,metadata) values(e.task_id,(select auth.uid()),'edited',jsonb_build_object('evidence_id',target_evidence));end$$;
revoke all on function public.edit_task_evidence(uuid,text,timestamptz) from public,anon;grant execute on function public.edit_task_evidence(uuid,text,timestamptz) to authenticated;

create policy task_operation_media_insert on storage.objects for insert to authenticated with check(bucket_id='operation-media' and name ~ '^tasks/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' and (storage.foldername(name))[4]=(select auth.uid())::text and exists(select 1 from public.tasks t join public.task_assignees ta on ta.task_id=t.id where t.id=((storage.foldername(name))[3])::uuid and t.station_id=((storage.foldername(name))[2])::uuid and ta.user_id=(select auth.uid()) and t.deleted_at is null));
create policy task_operation_media_select on storage.objects for select to authenticated using(bucket_id='operation-media' and (storage.foldername(name))[1]='tasks' and private.can_view_task(case when (storage.foldername(name))[3] ~* '^[0-9a-f-]{36}$' then ((storage.foldername(name))[3])::uuid end));

create trigger audit_task_assignees after insert or update or delete on public.task_assignees for each row execute function private.audit_change();
create trigger audit_task_evidence after insert or update or delete on public.task_evidence for each row execute function private.audit_change();
create trigger audit_tasks after insert or update or delete on public.tasks for each row execute function private.audit_change();
