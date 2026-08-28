-- Keep privileged implementations out of the exposed schema. Public API wrappers are invokers.
alter function public.create_task(uuid,text,text,text,timestamptz,uuid,uuid[],boolean,text,boolean,boolean) set schema private;
alter function public.start_task(uuid) set schema private;
alter function public.complete_task(uuid,text,timestamptz,uuid[]) set schema private;
alter function public.review_task(uuid,text,text) set schema private;
alter function public.edit_task_evidence(uuid,text,timestamptz) set schema private;
alter function public.list_tasks(uuid,boolean,text,text,timestamptz,uuid,integer) set schema private;
alter function public.get_task_detail(uuid) set schema private;

create function public.create_task(target_station uuid,task_title text,task_description text,task_priority text,target_due_date timestamptz,target_shift uuid,assignee_ids uuid[],requires_evidence boolean default false,required_evidence_type text default 'none',requires_review boolean default false,save_as_draft boolean default false)
returns uuid language sql volatile security invoker set search_path='' as $$select private.create_task(target_station,task_title,task_description,task_priority,target_due_date,target_shift,assignee_ids,requires_evidence,required_evidence_type,requires_review,save_as_draft)$$;
create function public.start_task(target_task uuid) returns void language sql volatile security invoker set search_path='' as $$select private.start_task(target_task)$$;
create function public.complete_task(target_task uuid,evidence_description text,target_completed_at timestamptz default now(),asset_ids uuid[] default '{}') returns uuid language sql volatile security invoker set search_path='' as $$select private.complete_task(target_task,evidence_description,target_completed_at,asset_ids)$$;
create function public.review_task(target_task uuid,decision text,rejection_reason text default null) returns void language sql volatile security invoker set search_path='' as $$select private.review_task(target_task,decision,rejection_reason)$$;
create function public.edit_task_evidence(target_evidence uuid,new_description text,new_completed_at timestamptz) returns void language sql volatile security invoker set search_path='' as $$select private.edit_task_evidence(target_evidence,new_description,new_completed_at)$$;
create function public.list_tasks(target_station uuid default null,mine_only boolean default false,status_filter text default null,search_text text default null,cursor_created timestamptz default null,cursor_id uuid default null,page_size integer default 20)
returns table(id uuid,station_id uuid,station_name text,station_slug text,title text,description text,priority text,status text,effective_status text,due_group text,due_date timestamptz,shift_name text,shift_window text,evidence_required boolean,evidence_type text,review_required boolean,created_by uuid,creator_name text,created_at timestamptz,assignees jsonb)
language sql stable security invoker set search_path='' as $$select * from private.list_tasks(target_station,mine_only,status_filter,search_text,cursor_created,cursor_id,page_size)$$;
create function public.get_task_detail(target_task uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_task_detail(target_task)$$;

revoke all on function public.create_task(uuid,text,text,text,timestamptz,uuid,uuid[],boolean,text,boolean,boolean),public.start_task(uuid),public.complete_task(uuid,text,timestamptz,uuid[]),public.review_task(uuid,text,text),public.edit_task_evidence(uuid,text,timestamptz),public.list_tasks(uuid,boolean,text,text,timestamptz,uuid,integer),public.get_task_detail(uuid) from public,anon;
grant execute on function public.create_task(uuid,text,text,text,timestamptz,uuid,uuid[],boolean,text,boolean,boolean),public.start_task(uuid),public.complete_task(uuid,text,timestamptz,uuid[]),public.review_task(uuid,text,text),public.edit_task_evidence(uuid,text,timestamptz),public.list_tasks(uuid,boolean,text,text,timestamptz,uuid,integer),public.get_task_detail(uuid) to authenticated;

drop policy if exists media_assets_insert on public.media_assets;
drop policy if exists task_media_asset_insert on public.media_assets;
create policy media_assets_insert on public.media_assets for insert to authenticated with check(
 uploaded_by=(select auth.uid()) and owner_id=(select auth.uid()) and deleted_at is null and (
  (bucket='profile-media' and station_id is null) or
  (bucket='operation-media' and station_id is not null and (private.has_permission_in_scope('status_posts.create',station_id,null) or (storage_path like 'tasks/%' and exists(select 1 from public.tasks t join public.task_assignees ta on ta.task_id=t.id where t.id=(split_part(storage_path,'/',3))::uuid and t.station_id=media_assets.station_id and ta.user_id=(select auth.uid()) and t.deleted_at is null)))) or
  (bucket='shared-content' and (station_id is null or private.has_permission_in_scope('files.upload',station_id,null))) or
  (bucket='brand-assets' and private.has_permission_in_scope('system.manage_settings'))
 )
);
