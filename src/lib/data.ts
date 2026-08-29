import { cache } from "react";
import { failDataAccess } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { Station } from "@/types/database";

const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) failDataAccess("auth.user", error);
  return data.user;
});

export const getMyStations = cache(async (): Promise<Station[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stations").select("id,city,name,slug,is_active").eq("is_active", true).is("deleted_at", null).order("city");
  if (error) failDataAccess("stations.list", error);
  return data as Station[];
});

export const getProfile = cache(async () => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) failDataAccess("profile.get", error);
  return data?.[0] ?? null;
});

export const getStation = cache(async (slug: string) => {
  const stations = await getMyStations();
  return stations.find((station) => station.slug === slug) ?? null;
});

export const hasAdminAccess = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_admin_access");
  if (error) failDataAccess("access.admin", error);
  return data === true;
});

export const getMyRoles = cache(async () => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];
  const { data: assignments, error: assignmentError } = await supabase.from("user_roles").select("role_id").eq("user_id", user.id);
  if (assignmentError) failDataAccess("roles.assignments", assignmentError);
  const ids = (assignments ?? []).map((item) => item.role_id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("roles").select("name,slug").in("id", ids).eq("is_active", true).order("name");
  if (error) failDataAccess("roles.list", error);
  return data ?? [];
});

export const getDashboardContent = cache(async () => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { tasks: [], announcements: [] };
  const [tasks, announcements] = await Promise.all([
    supabase.from("tasks").select("id,title,status,station_id,created_at").eq("assignee_id", user.id).neq("status", "completed").order("created_at", { ascending: false }).limit(3),
    supabase.from("announcements").select("id,title,body,station_id,created_at").order("created_at", { ascending: false }).limit(3),
  ]);
  if (tasks.error) failDataAccess("dashboard.tasks", tasks.error);
  if (announcements.error) failDataAccess("dashboard.announcements", announcements.error);
  return { tasks: tasks.data ?? [], announcements: announcements.data ?? [] };
});

export type NotificationItem = { id:string; title:string; body:string|null; is_read:boolean; read_at:string|null; type:string; entity_type:string|null; entity_id:string|null; action_url:string|null; severity:string; created_at:string };

export async function getNotifications(options: { kind?: string; unread?: boolean } = {}): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_notifications", { kind_filter: options.kind ?? null, unread_only: options.unread ?? false, cursor_created: null, cursor_id: null, page_size: 30 });
  if (error) failDataAccess("notifications.list", error);
  return (data ?? []) as NotificationItem[];
}

export const getNotificationUnreadCount = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("notification_unread_count");
  if (error) failDataAccess("notifications.unread", error);
  return Number(data ?? 0);
});

export const getStationContent = cache(async (slug: string) => {
  const station = await getStation(slug);
  if (!station) return null;
  const supabase = await createClient();
  const [announcements, tasks, personnel] = await Promise.all([
    supabase.from("announcements").select("id,title,body,created_at").eq("station_id", station.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("tasks").select("id,title,status,assignee_id,created_at").eq("station_id", station.id).order("created_at", { ascending: false }).limit(20),
    supabase.rpc("get_station_personnel", { target_station: station.id }),
  ]);
  if (announcements.error) failDataAccess("station.announcements", announcements.error);
  if (tasks.error) failDataAccess("station.tasks", tasks.error);
  if (personnel.error) failDataAccess("station.personnel", personnel.error);
  return { station, announcements: announcements.data ?? [], tasks: tasks.data ?? [], personnel: ((personnel.data ?? []) as StationPersonnel[]).map((person) => ({ ...person, id: person.user_id })) };
});

type StationPersonnel = { user_id:string; id:string; first_name:string; last_name:string; avatar_url:string|null; role_name:string|null; role_rank:number|null; phone:string|null };
