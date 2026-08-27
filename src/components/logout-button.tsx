"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      setBusy(false);
      window.alert("Çıkış yapılamadı. Lütfen tekrar deneyin.");
      return;
    }

    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHES" });
    if ("caches" in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
    router.replace("/login");
    router.refresh();
  }

  return <button type="button" onClick={logout} disabled={busy} className="flex min-w-16 flex-col items-center gap-1 rounded-xl p-2 text-[10px] text-rose-400 transition hover:bg-red-950/50 hover:text-rose-300 disabled:cursor-wait disabled:opacity-60" aria-label="Hesaptan çıkış yap">{busy?<LoaderCircle size={20} className="animate-spin"/>:<LogOut size={20}/>}<span>{busy?"Çıkılıyor":"Çıkış yap"}</span></button>;
}
