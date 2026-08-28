import Link from "next/link";
import { Activity, Building2, ChevronRight, KeyRound, Shield, UserCheck, Users } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { Brand } from "@/components/brand";
import { getAdminCounts } from "@/lib/admin-data";
import { getEffectivePermissions } from "@/lib/auth/effective-access";

const sections = [
  ["pending-users", UserCheck, "Bekleyen Kullanıcılar", "Onay, rol ve istasyon atama"],
  ["users", Users, "Kullanıcılar", "Hesap durumları ve erişimler"],
  ["stations", Building2, "İstasyonlar", "Yeni istasyon ve düzenlemeler"],
  ["roles", Shield, "Roller", "Dinamik rol ve varsayılan yetkiler"],
  ["permissions", KeyRound, "Yetkiler", "Global ve istasyon bazlı izinler"],
  ["role-matrix", Shield, "Rol–Yetki Matrisi", "Rollerin başlangıç ve etkin izinleri"],
  ["user-permissions", KeyRound, "Kullanıcı İstisnaları", "Kullanıcıya özel izin ve ret kararları"],
  ["operators", Shield, "Sistem Yöneticileri / OP", "Kritik sistem erişimleri"],
  ["audit-logs", Activity, "Audit Logs", "Değiştirilemez işlem geçmişi"],
] as const;
const required:Record<string,string>={"pending-users":"personnel.edit",users:"personnel.view_directory",stations:"stations.view_all",roles:"roles.view",permissions:"roles.view","role-matrix":"roles.assign_permissions","user-permissions":"roles.assign_permissions",operators:"system.manage_operators","audit-logs":"audit.view"};
const countIndex:Record<string,number>={"pending-users":0,users:1,stations:2,roles:3,permissions:4,operators:5,"audit-logs":6};

export default async function Admin() {
  const [counts,permissions] = await Promise.all([getAdminCounts(),getEffectivePermissions()]);const visible=sections.filter(([slug])=>permissions.has(required[slug]));
  return <main className="shell"><header className="flex items-center justify-between"><Brand/><span className="rounded-full border border-red-900 bg-red-950/50 px-3 py-1 text-xs font-bold text-red-300">YÖNETİM</span></header><section className="mt-12"><p className="eyebrow">Kontrol merkezi</p><h1 className="mt-2 text-3xl font-bold">Yönetici paneli</h1><p className="muted mt-2">Yalnızca yetkili olduğunuz yönetim bölümleri gösterilir.</p></section><div className="mt-8 grid gap-3 md:grid-cols-2">{visible.map(([slug,Icon,title,text])=><Link key={slug} href={`/admin/${slug}`} className="glass flex items-center gap-4 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-zinc-600"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-800 text-rose-400"><Icon/></span><span className="min-w-0 flex-1"><strong className="block">{title}</strong><small className="muted block truncate">{text}</small></span>{slug in countIndex?<span className="hidden rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 sm:block">{counts[countIndex[slug]]} kayıt</span>:null}<ChevronRight size={18} className="text-zinc-600"/></Link>)}</div><div className="mt-8 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-100"><strong>Kritik işlem koruması:</strong> Yetki ve OP değişiklikleri ayrıca sunucu ve RLS katmanında doğrulanır.</div><AppNav/></main>;
}
