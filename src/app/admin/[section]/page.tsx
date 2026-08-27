import Link from "next/link";
import { ArrowLeft, Database, Inbox } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminCreatePanel, AdminRowControls } from "@/components/admin-controls";
import { getAdminFormOptions, getAdminSectionRows, type AdminSection } from "@/lib/admin-data";

const sectionDetails={
  "pending-users":["Bekleyen Kullanıcılar","Yeni hesapların onay, rol ve istasyon atama sürecini yönetin."],
  users:["Kullanıcılar","Personel hesaplarının güncel durumlarını ve erişim bilgilerini görüntüleyin."],
  stations:["İstasyonlar","Aktif ve pasif istasyon kayıtlarını tek noktadan takip edin."],
  roles:["Roller","Sistem ve özel rollerin tanımlarını inceleyin."],
  permissions:["Yetkiler","Global ve istasyon bazlı izin kataloğunu görüntüleyin."],
  operators:["Sistem Yöneticileri / OP","Kritik sistem erişimine sahip yöneticileri takip edin."],
  "audit-logs":["Audit Logs","Son 100 yönetim işlemini tarih sırasına göre inceleyin."],
} as const;

const badgeStyles={
  success:"border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
  warning:"border-amber-900/60 bg-amber-950/40 text-amber-200",
  danger:"border-red-900/60 bg-red-950/40 text-red-300",
  neutral:"border-zinc-700 bg-zinc-800 text-zinc-300",
};

export default async function AdminSection({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const[{section},notice]=await Promise.all([params,searchParams]);
  if(!(section in sectionDetails))notFound();
  const[title,description]=sectionDetails[section as keyof typeof sectionDetails];
  const currentSection=section as AdminSection;
  const [{rows,error},options]=await Promise.all([getAdminSectionRows(currentSection),getAdminFormOptions()]);
  return <main className="shell"><Link href="/admin" className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-900"><ArrowLeft size={17}/>Yönetici paneline dön</Link><header className="mt-9"><p className="eyebrow">Yönetim modülü</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">{title}</h1><p className="muted mt-3 max-w-2xl leading-7">{description}</p></div><span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300">{rows.length} kayıt</span></div></header>{notice.saved?<div role="status" className="mt-6 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm font-semibold text-emerald-200">İşlem başarıyla tamamlandı.</div>:null}{notice.error?<div role="alert" className="mt-6 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{notice.error}</div>:null}<AdminCreatePanel section={currentSection}/>{error?<div className="mt-8 rounded-2xl border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-200"><strong>Veriler alınamadı.</strong><p className="mt-1 text-red-300/80">{error}</p></div>:rows.length===0?<section className="glass mt-8 grid place-items-center rounded-[28px] px-6 py-16 text-center"><Inbox size={36} className="text-zinc-600"/><h2 className="mt-4 text-lg font-bold">Henüz kayıt yok</h2><p className="muted mt-2 text-sm">Bu bölüme eklenecek kayıtlar burada görünecek.</p></section>:<section className="mt-8 grid gap-3">{rows.map(row=><article key={row.id} className="glass flex flex-wrap items-center gap-4 rounded-2xl p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-rose-400"><Database size={20}/></span><div className="min-w-56 flex-1"><h2 className="font-bold text-zinc-100">{row.title}</h2><p className="mt-1 break-words text-sm text-zinc-400">{row.subtitle}</p><p className="mt-2 text-xs text-zinc-500">{row.meta}</p></div><span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyles[row.badgeTone??"neutral"]}`}>{row.badge}</span><AdminRowControls section={currentSection} row={row} options={options}/></article>)}</section>}</main>
}
