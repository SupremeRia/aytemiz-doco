import Link from "next/link";
import { ArrowLeft,Construction,ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

const sectionDetails={
  "pending-users":["Bekleyen Kullanıcılar","Yeni hesapların onay, rol ve istasyon atama işlemleri bu alanda yönetilecek."],
  users:["Kullanıcılar","Personel hesapları, durumları ve erişim özetleri bu alanda yönetilecek."],
  stations:["İstasyonlar","Yeni istasyon oluşturma ve mevcut istasyon düzenlemeleri bu alanda yapılacak."],
  roles:["Roller","Dinamik roller ve varsayılan rol yetkileri bu alanda yönetilecek."],
  permissions:["Yetkiler","Global ve istasyon bazlı izinler bu alanda yönetilecek."],
  operators:["Sistem Yöneticileri / OP","Kritik sistem erişimleri ve OP atamaları bu alanda yönetilecek."],
  "audit-logs":["Audit Logs","Değiştirilemeyen yönetim işlem geçmişi bu alanda görüntülenecek."],
} as const;

export default async function AdminSection({params}:{params:Promise<{section:string}>}){
  const{section}=await params;
  if(!(section in sectionDetails))notFound();
  const[title,description]=sectionDetails[section as keyof typeof sectionDetails];
  return <main className="shell"><Link href="/admin" className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-900"><ArrowLeft size={17}/>Yönetici paneline dön</Link><section className="glass mt-8 rounded-[30px] p-7 sm:p-10"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-red-950/60 text-rose-400"><Construction size={30}/></span><p className="eyebrow mt-8">Yönetim modülü</p><h1 className="mt-2 text-3xl font-bold">{title}</h1><p className="muted mt-3 max-w-2xl leading-7">{description}</p><div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-4 text-sm text-emerald-200"><ShieldCheck size={19}/><span>Sayfa bağlantısı aktif. Yönetim işlemleri güvenli onay ve audit log yapısıyla sırayla eklenecek.</span></div></section></main>
}
