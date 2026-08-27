import Link from "next/link";
import { Bell, Building2, CheckSquare, Home, Settings, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const links = [
  ["/dashboard", Home, "Ana Sayfa"],
  ["/dashboard#stations", Building2, "İstasyon"],
  ["/dashboard#tasks", CheckSquare, "Görevler"],
  ["/dashboard#notifications", Bell, "Bildirimler"],
  ["/profile", UserRound, "Profil"],
] as const;

export function AppNav() {
  return <nav aria-label="Uygulama menüsü" className="fixed inset-x-2 bottom-2 z-20 mx-auto flex max-w-xl justify-around rounded-2xl border border-zinc-800 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur md:left-6 md:right-auto md:top-1/2 md:bottom-auto md:w-20 md:-translate-y-1/2 md:flex-col md:gap-2">{links.map(([href, Icon, label])=><Link key={label} href={href} className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-xl p-1 text-[10px] text-zinc-400 transition hover:bg-zinc-800 hover:text-white"><Icon size={20}/>{label}</Link>)}<Link href="/admin" aria-label="Yönetim" className="hidden min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-white md:flex"><Settings size={20}/>Yönetim</Link><span className="hidden h-px w-10 bg-zinc-800 md:block"/><LogoutButton/></nav>;
}
