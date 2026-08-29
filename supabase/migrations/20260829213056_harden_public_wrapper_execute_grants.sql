-- Public wrappers are Data API entry points for signed-in users only. Earlier
-- migrations granted authenticated without first removing PostgreSQL's
-- default EXECUTE privilege from PUBLIC.
revoke all on function
  public.create_announcement(text,text,text,text,uuid,uuid,uuid[],boolean),
  public.create_operation_post(uuid,text,text,uuid,uuid[],uuid[],boolean),
  public.delete_announcement(uuid),
  public.delete_operation_post(uuid),
  public.get_announcement_detail(uuid),
  public.get_operation_post(uuid),
  public.list_announcements(uuid,text,text,boolean,timestamptz,uuid,integer),
  public.list_notifications(text,boolean,timestamptz,uuid,integer),
  public.list_operation_posts(uuid,text,text,date,date,uuid,uuid,timestamptz,uuid,integer),
  public.mark_all_notifications_read(),
  public.mark_announcement_read(uuid),
  public.mark_notification_read(uuid),
  public.notification_unread_count(),
  public.remove_user_permission(uuid),
  public.search_user_directory(text,uuid,text,uuid,integer),
  public.update_announcement(uuid,text,text,text),
  public.update_operation_post(uuid,text,text,uuid,uuid[],boolean)
from public, anon;

grant execute on function
  public.create_announcement(text,text,text,text,uuid,uuid,uuid[],boolean),
  public.create_operation_post(uuid,text,text,uuid,uuid[],uuid[],boolean),
  public.delete_announcement(uuid),
  public.delete_operation_post(uuid),
  public.get_announcement_detail(uuid),
  public.get_operation_post(uuid),
  public.list_announcements(uuid,text,text,boolean,timestamptz,uuid,integer),
  public.list_notifications(text,boolean,timestamptz,uuid,integer),
  public.list_operation_posts(uuid,text,text,date,date,uuid,uuid,timestamptz,uuid,integer),
  public.mark_all_notifications_read(),
  public.mark_announcement_read(uuid),
  public.mark_notification_read(uuid),
  public.notification_unread_count(),
  public.remove_user_permission(uuid),
  public.search_user_directory(text,uuid,text,uuid,integer),
  public.update_announcement(uuid,text,text,text),
  public.update_operation_post(uuid,text,text,uuid,uuid[],boolean)
to authenticated;
