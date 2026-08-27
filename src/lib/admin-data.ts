import { createClient } from "@/lib/supabase/server";

export type AdminSection = "pending-users" | "users" | "stations" | "roles" | "permissions" | "operators" | "audit-logs";

export type AdminRow = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  badgeTone?: "success" | "warning" | "danger" | "neutral";
  state?: string;
  details?: {
    firstName: string;
    lastName: string;
    phone: string;
    employeeNumber: string;
    roleIds: string[];
    stationIds: string[];
  };
};

export type AdminFormOptions = {
  roles: { id: string; name: string }[];
  stations: { id: string; name: string; city: string }[];
};

const shortId = (value: string | null) => value ? `${value.slice(0, 8)}…` : "Sistem";
const date = (value: string) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));

export async function getAdminCounts() {
  const supabase = await createClient();
  const queries = [
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).neq("status", "deleted"),
    supabase.from("stations").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("roles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("permissions").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("system_admins").select("id", { count: "exact", head: true }).eq("is_op", true),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ];
  const results = await Promise.all(queries);
  return results.map(({ count }) => count ?? 0);
}

export async function getAdminSectionRows(section: AdminSection): Promise<{ rows: AdminRow[]; error: string | null }> {
  const supabase = await createClient();

  if (section === "pending-users" || section === "users") {
    let query = supabase.from("profiles").select("id,first_name,last_name,email,status,phone,employee_number,created_at").order("created_at", { ascending: false });
    query = section === "pending-users" ? query.eq("status", "pending") : query.neq("status", "deleted");
    const [{ data, error }, { data: roleAssignments }, { data: stationAssignments }] = await Promise.all([
      query,
      supabase.from("user_roles").select("user_id,role_id"),
      supabase.from("user_station_assignments").select("user_id,station_id"),
    ]);
    const rolesByUser = groupAssignments(roleAssignments ?? [], "role_id");
    const stationsByUser = groupAssignments(stationAssignments ?? [], "station_id");
    return {
      error: error?.message ?? null,
      rows: (data ?? []).map((profile) => ({
        id: profile.id,
        title: `${profile.first_name} ${profile.last_name}`.trim() || "İsimsiz kullanıcı",
        subtitle: profile.email,
        meta: profile.employee_number ? `Sicil: ${profile.employee_number}` : `Kayıt: ${date(profile.created_at)}`,
        badge: statusLabel(profile.status),
        badgeTone: statusTone(profile.status),
        state: profile.status,
        details: {
          firstName: profile.first_name,
          lastName: profile.last_name,
          phone: profile.phone ?? "",
          employeeNumber: profile.employee_number ?? "",
          roleIds: rolesByUser.get(profile.id) ?? [],
          stationIds: stationsByUser.get(profile.id) ?? [],
        },
      })),
    };
  }

  if (section === "stations") {
    const { data, error } = await supabase.from("stations").select("id,name,city,station_code,address,is_active").order("city").order("name");
    return {
      error: error?.message ?? null,
      rows: (data ?? []).map((station) => ({
        id: station.id,
        title: station.name,
        subtitle: [station.city, station.address].filter(Boolean).join(" · "),
        meta: station.station_code ? `İstasyon kodu: ${station.station_code}` : "İstasyon kodu girilmemiş",
        badge: station.is_active ? "Aktif" : "Pasif",
        badgeTone: station.is_active ? "success" : "neutral",
        state: String(station.is_active),
      })),
    };
  }

  if (section === "roles") {
    const { data, error } = await supabase.from("roles").select("id,name,slug,description,is_system_role,is_active").order("name");
    return {
      error: error?.message ?? null,
      rows: (data ?? []).map((role) => ({
        id: role.id,
        title: role.name,
        subtitle: role.description || "Açıklama girilmemiş",
        meta: role.slug,
        badge: role.is_system_role ? "Sistem rolü" : role.is_active ? "Özel rol" : "Pasif",
        badgeTone: role.is_active ? "neutral" : "danger",
        state: String(role.is_active),
      })),
    };
  }

  if (section === "permissions") {
    const { data, error } = await supabase.from("permissions").select("id,name,slug,description,category,scope_type,is_active").order("category").order("name");
    return {
      error: error?.message ?? null,
      rows: (data ?? []).map((permission) => ({
        id: permission.id,
        title: permission.name,
        subtitle: permission.description || permission.slug,
        meta: permission.category,
        badge: scopeLabel(permission.scope_type),
        badgeTone: permission.is_active ? "neutral" : "danger",
        state: String(permission.is_active),
      })),
    };
  }

  if (section === "operators") {
    const [{ data: operators, error }, { data: profiles }] = await Promise.all([
      supabase.from("system_admins").select("id,user_id,is_op,created_at").order("created_at"),
      supabase.from("profiles").select("id,first_name,last_name,email"),
    ]);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return {
      error: error?.message ?? null,
      rows: (operators ?? []).map((operator) => {
        const profile = profileMap.get(operator.user_id);
        return {
          id: operator.id,
          title: profile ? `${profile.first_name} ${profile.last_name}`.trim() || "İsimsiz yönetici" : "Yönetici hesabı",
          subtitle: profile?.email ?? shortId(operator.user_id),
          meta: `Atanma: ${date(operator.created_at)}`,
          badge: operator.is_op ? "OP" : "Pasif",
          badgeTone: operator.is_op ? "success" : "neutral",
        };
      }),
    };
  }

  const { data, error } = await supabase.from("audit_logs").select("id,actor_user_id,action,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(100);
  return {
    error: error?.message ?? null,
    rows: (data ?? []).map((log) => ({
      id: String(log.id),
      title: actionLabel(log.action, log.target_type),
      subtitle: `Hedef: ${log.target_type} · ${shortId(log.target_id)}`,
      meta: `${date(log.created_at)} · İşlemi yapan: ${shortId(log.actor_user_id)}`,
      badge: log.action.toLocaleUpperCase("tr-TR"),
      badgeTone: log.action === "delete" ? "danger" : log.action === "insert" ? "success" : "warning",
    })),
  };
}

function groupAssignments<T extends "role_id"|"station_id">(rows: ({ user_id: string } & Record<T,string>)[], key: T) {
  const grouped = new Map<string,string[]>();
  for (const row of rows) grouped.set(row.user_id, [...(grouped.get(row.user_id) ?? []), row[key]]);
  return grouped;
}

export async function getAdminFormOptions(): Promise<AdminFormOptions> {
  const supabase = await createClient();
  const [{ data: roles }, { data: stations }] = await Promise.all([
    supabase.from("roles").select("id,name").eq("is_active", true).order("name"),
    supabase.from("stations").select("id,name,city").eq("is_active", true).order("city").order("name"),
  ]);
  return { roles: roles ?? [], stations: stations ?? [] };
}

function statusLabel(status: string) {
  return ({ pending: "Onay bekliyor", active: "Aktif", suspended: "Askıda", banned: "Engelli", deleted: "Silindi" } as Record<string, string>)[status] ?? status;
}

function statusTone(status: string): AdminRow["badgeTone"] {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  if (status === "suspended" || status === "banned" || status === "deleted") return "danger";
  return "neutral";
}

function scopeLabel(scope: string) {
  return ({ global: "Global", station: "İstasyon", both: "Global + İstasyon" } as Record<string, string>)[scope] ?? scope;
}

function actionLabel(action: string, target: string) {
  const verb = ({ insert: "Oluşturuldu", update: "Güncellendi", delete: "Silindi" } as Record<string, string>)[action] ?? action;
  return `${target} ${verb}`;
}
