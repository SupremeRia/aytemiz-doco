import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requirePermission(permission: string, stationId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: allowed, error } = await supabase.rpc("can", {
    permission_slug: permission,
    check_station: stationId ?? null,
  });
  if (error || !allowed) throw new Error("Bu işlem için yetkiniz bulunmuyor.");
  return { supabase, user };
}
