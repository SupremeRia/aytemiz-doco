import { AppNavClient } from "@/components/app-nav-client";
import { getNotificationUnreadCount } from "@/lib/data";
import { loadOptionalData } from "@/lib/optional-data";

export async function AppNav(props: { isAdmin?: boolean; fallbackStation?: string }) {
  const unreadCount = await loadOptionalData(getNotificationUnreadCount(), 0, "notifications.unread");
  return <AppNavClient {...props} unreadCount={unreadCount} />;
}
