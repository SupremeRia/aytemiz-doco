alter function public.save_handover(uuid,uuid,date,text,text,jsonb,uuid[]) set schema private;
alter function public.submit_handover(uuid,uuid[]) set schema private;
alter function public.acknowledge_handover(uuid) set schema private;
alter function public.ensure_checklist_runs(uuid,date,uuid) set schema private;
alter function public.create_checklist_template(text,uuid,uuid,uuid,text,text,jsonb) set schema private;
alter function public.update_checklist_item(uuid,text,text,uuid[]) set schema private;
alter function public.complete_checklist(uuid) set schema private;
alter function public.create_issue(uuid,text,text,text,text,uuid,uuid[]) set schema private;
alter function public.add_issue_event(uuid,text) set schema private;
alter function public.transition_issue(uuid,text,text) set schema private;
alter function public.delete_issue(uuid) set schema private;
alter function public.get_station_operations(uuid,date) set schema private;
alter function public.save_daily_report_note(uuid,date,text) set schema private;
alter function public.create_source_task(text,uuid,text) set schema private;

revoke all on all functions in schema private from public,anon;
grant execute on function private.save_handover(uuid,uuid,date,text,text,jsonb,uuid[]),private.submit_handover(uuid,uuid[]),private.acknowledge_handover(uuid),private.ensure_checklist_runs(uuid,date,uuid),private.create_checklist_template(text,uuid,uuid,uuid,text,text,jsonb),private.update_checklist_item(uuid,text,text,uuid[]),private.complete_checklist(uuid),private.create_issue(uuid,text,text,text,text,uuid,uuid[]),private.add_issue_event(uuid,text),private.transition_issue(uuid,text,text),private.delete_issue(uuid),private.get_station_operations(uuid,date),private.save_daily_report_note(uuid,date,text),private.create_source_task(text,uuid,text) to authenticated;

create function public.save_handover(target_station uuid,target_shift uuid,target_date date,general_text text,next_text text,items jsonb,participant_ids uuid[] default '{}') returns uuid language sql volatile security invoker set search_path='' as $$select private.save_handover(target_station,target_shift,target_date,general_text,next_text,items,participant_ids)$$;
create function public.submit_handover(target_handover uuid,media_ids uuid[] default '{}') returns void language sql volatile security invoker set search_path='' as $$select private.submit_handover(target_handover,media_ids)$$;
create function public.acknowledge_handover(target_handover uuid) returns void language sql volatile security invoker set search_path='' as $$select private.acknowledge_handover(target_handover)$$;
create function public.ensure_checklist_runs(target_station uuid,target_date date,target_shift uuid default null) returns integer language sql volatile security invoker set search_path='' as $$select private.ensure_checklist_runs(target_station,target_date,target_shift)$$;
create function public.create_checklist_template(target_scope text,target_station uuid,target_region uuid,target_shift uuid,template_name text,template_description text,items jsonb) returns uuid language sql volatile security invoker set search_path='' as $$select private.create_checklist_template(target_scope,target_station,target_region,target_shift,template_name,template_description,items)$$;
create function public.update_checklist_item(target_item uuid,new_status text,new_note text,media_ids uuid[] default '{}') returns void language sql volatile security invoker set search_path='' as $$select private.update_checklist_item(target_item,new_status,new_note,media_ids)$$;
create function public.complete_checklist(target_run uuid) returns void language sql volatile security invoker set search_path='' as $$select private.complete_checklist(target_run)$$;
create function public.create_issue(target_station uuid,issue_title text,issue_description text,issue_category text,issue_priority text,target_assignee uuid default null,media_ids uuid[] default '{}') returns uuid language sql volatile security invoker set search_path='' as $$select private.create_issue(target_station,issue_title,issue_description,issue_category,issue_priority,target_assignee,media_ids)$$;
create function public.add_issue_event(target_issue uuid,event_body text) returns void language sql volatile security invoker set search_path='' as $$select private.add_issue_event(target_issue,event_body)$$;
create function public.transition_issue(target_issue uuid,new_status text,resolution_note text default null) returns void language sql volatile security invoker set search_path='' as $$select private.transition_issue(target_issue,new_status,resolution_note)$$;
create function public.delete_issue(target_issue uuid) returns void language sql volatile security invoker set search_path='' as $$select private.delete_issue(target_issue)$$;
create function public.get_station_operations(target_station uuid,target_date date default current_date) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_station_operations(target_station,target_date)$$;
create function public.save_daily_report_note(target_station uuid,target_date date,note_content text) returns uuid language sql volatile security invoker set search_path='' as $$select private.save_daily_report_note(target_station,target_date,note_content)$$;
create function public.create_source_task(source_kind text,target_source uuid,task_title text) returns uuid language sql volatile security invoker set search_path='' as $$select private.create_source_task(source_kind,target_source,task_title)$$;
revoke all on function public.save_handover(uuid,uuid,date,text,text,jsonb,uuid[]),public.submit_handover(uuid,uuid[]),public.acknowledge_handover(uuid),public.ensure_checklist_runs(uuid,date,uuid),public.create_checklist_template(text,uuid,uuid,uuid,text,text,jsonb),public.update_checklist_item(uuid,text,text,uuid[]),public.complete_checklist(uuid),public.create_issue(uuid,text,text,text,text,uuid,uuid[]),public.add_issue_event(uuid,text),public.transition_issue(uuid,text,text),public.delete_issue(uuid),public.get_station_operations(uuid,date),public.save_daily_report_note(uuid,date,text),public.create_source_task(text,uuid,text) from public,anon;
grant execute on function public.save_handover(uuid,uuid,date,text,text,jsonb,uuid[]),public.submit_handover(uuid,uuid[]),public.acknowledge_handover(uuid),public.ensure_checklist_runs(uuid,date,uuid),public.create_checklist_template(text,uuid,uuid,uuid,text,text,jsonb),public.update_checklist_item(uuid,text,text,uuid[]),public.complete_checklist(uuid),public.create_issue(uuid,text,text,text,text,uuid,uuid[]),public.add_issue_event(uuid,text),public.transition_issue(uuid,text,text),public.delete_issue(uuid),public.get_station_operations(uuid,date),public.save_daily_report_note(uuid,date,text),public.create_source_task(text,uuid,text) to authenticated;

drop policy phase6_media_asset_insert on public.media_assets;
drop policy media_assets_insert on public.media_assets;
create policy media_assets_insert on public.media_assets for insert to authenticated with check(
 uploaded_by=(select auth.uid()) and owner_id=(select auth.uid()) and deleted_at is null and (
  (bucket='profile-media' and station_id is null)
  or (bucket='operation-media' and station_id is not null and (
   private.has_permission_in_scope('status_posts.create',station_id,null)
   or (storage_path like 'tasks/%' and exists(select 1 from public.tasks t join public.task_assignees ta on ta.task_id=t.id where t.id=(split_part(storage_path,'/',3))::uuid and t.station_id=media_assets.station_id and ta.user_id=(select auth.uid()) and t.deleted_at is null))
   or (storage_path like 'phase6/'||station_id::text||'/%' and private.can_access_station(station_id))
  ))
  or (bucket='shared-content' and (
   (storage_path like 'files/%' and station_id is not null and private.has_permission_in_scope('files.upload',station_id,null))
   or (metadata->>'announcement_scope'='global' and station_id is null and private.has_permission_in_scope('announcements.create'))
   or (metadata->>'announcement_scope'='region' and station_id is null and private.has_permission_in_scope('announcements.create',null,(metadata->>'region_id')::uuid))
   or (metadata->>'announcement_scope'='station' and station_id is not null and private.has_permission_in_scope('announcements.create',station_id,null))
   or (metadata->>'announcement_scope' is null and storage_path not like 'files/%' and (station_id is null or private.has_permission_in_scope('files.upload',station_id,null)))
  ))
  or (bucket='brand-assets' and private.has_permission_in_scope('system.manage_settings'))
 )
);
