import { AppNavClient } from "@/components/app-nav-client";
import { getNotificationUnreadCount } from "@/lib/data";
import { DataAccessError } from "@/lib/observability";

async function unreadCountOrFallback() {
  try {
    return await getNotificationUnreadCount();
  } catch (error) {
    console.error("[app-nav.optional]", { operation: "notifications.unread", incidentId: error instanceof DataAccessError ? error.incidentId : undefined });
    return 0;
  }
}

export async function AppNav(props: { isAdmin?: boolean; fallbackStation?: string }) {
  return <AppNavClient {...props} unreadCount={await unreadCountOrFallback()} />;
}
