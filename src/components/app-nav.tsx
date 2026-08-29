import { AppNavClient } from "@/components/app-nav-client";
import { getNotificationUnreadCount } from "@/lib/data";

export async function AppNav(props: { isAdmin?: boolean; fallbackStation?: string }) {
  return <AppNavClient {...props} unreadCount={await getNotificationUnreadCount()} />;
}
