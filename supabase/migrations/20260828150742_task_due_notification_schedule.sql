create extension if not exists pg_cron;

create or replace function private.enqueue_task_due_notifications() returns void language plpgsql security definer set search_path='' as $$
declare row record;begin
 for row in select t.id,t.title,ta.user_id,t.due_date from public.tasks t join public.task_assignees ta on ta.task_id=t.id where t.deleted_at is null and t.status not in('completed','cancelled') and t.due_date is not null and t.due_date between now() and now()+interval '2 hours'
 loop perform private.task_notify(row.user_id,row.id,'task_due_soon','Görevin son tarihi yaklaşıyor',row.title,'task_due_soon:'||row.id||':'||row.user_id);end loop;
 for row in select t.id,t.title,ta.user_id,t.due_date from public.tasks t join public.task_assignees ta on ta.task_id=t.id where t.deleted_at is null and t.status not in('completed','cancelled') and t.due_date is not null and t.due_date<now()
 loop perform private.task_notify(row.user_id,row.id,'task_overdue','Görev gecikti',row.title,'task_overdue:'||row.id||':'||row.user_id);end loop;
end$$;
revoke all on function private.enqueue_task_due_notifications() from public,anon,authenticated;

do $$declare existing_job bigint;begin
 select jobid into existing_job from cron.job where jobname='task-due-notifications';
 if existing_job is not null then perform cron.unschedule(existing_job);end if;
 perform cron.schedule('task-due-notifications','*/15 * * * *',$command$select private.enqueue_task_due_notifications()$command$);
end$$;
