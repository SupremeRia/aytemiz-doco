import Link from "next/link";
import { ArrowRight, Building2, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";

const features=[
  [Building2,"İstasyon yönetimi","İstasyonları, ekipleri ve günlük operasyonu tek çalışma alanında takip edin."],
  [MessageSquareText,"Ekip iletişimi","Duyurular, mesajlar ve görevlerle herkes aynı bilgi üzerinde çalışsın."],
  [ShieldCheck,"Güvenli yetkilendirme","OP, rol ve istasyon bazlı erişimlerle doğru kişiye doğru alanı açın."],
] as const;

export default async function Home({searchParams}:{searchParams:Promise<{registered?:string}>}){
  const{registered}=await searchParams;
  return <main className="shell">
    <header className="flex items-center justify-between gap-4 py-2">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600 font-black shadow-lg shadow-red-950/40">D</span><span><strong className="block text-lg leading-none">Aytemiz Doco</strong><small className="muted">İstasyon ekip platformu</small></span></Link>
      <div className="flex gap-2"><Link href="/login" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-900">Giriş</Link><Link href="/register" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500">Kayıt ol</Link></div>
    </header>
    {registered&&<div role="status" className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4 text-emerald-200">Hesabınız oluşturuldu. Yetkilendirme tamamlanana kadar tanıtım alanını inceleyebilirsiniz.</div>}
    <section className="grid items-center gap-10 py-20 lg:grid-cols-[1.2fr_.8fr] lg:py-28">
      <div><p className="eyebrow">DOCO operasyonlarını tek yerde buluşturun</p><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">İstasyon ekipleri için sade, hızlı ve güvenli çalışma alanı.</h1><p className="muted mt-6 max-w-2xl text-lg leading-8">Aytemiz Doco; istasyon yönetimi, ekip iletişimi, duyurular ve görevleri mobil uyumlu tek platformda toplar.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="btn-primary">Ekibe katılın <ArrowRight size={18}/></Link><Link href="#ozellikler" className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold hover:bg-zinc-900">Platformu tanıyın</Link></div></div>
      <div className="glass rounded-[32px] p-6 sm:p-8"><p className="eyebrow">İstasyon odaklı</p><div className="mt-6 grid gap-4"><div className="rounded-2xl bg-zinc-900 p-5"><UsersRound className="text-rose-400"/><strong className="mt-4 block text-xl">Ekipler aynı ritimde</strong><p className="muted mt-2 text-sm leading-6">Görevler, duyurular ve yetkiler istasyon bazında düzenlenir.</p></div><div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5"><ShieldCheck className="text-emerald-400"/><strong className="mt-4 block text-xl">Kontrollü erişim</strong><p className="muted mt-2 text-sm leading-6">Yeni hesaplar tanıtım alanını görebilir; çalışma alanları yetki verildiğinde açılır.</p></div></div></div>
    </section>
    <section id="ozellikler" className="pb-20"><p className="eyebrow">Platform özellikleri</p><h2 className="mt-3 text-3xl font-bold">Saha operasyonuna göre tasarlandı</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{features.map(([Icon,title,text])=><article key={title} className="glass rounded-3xl p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-800"><Icon/></span><h3 className="mt-6 text-xl font-bold">{title}</h3><p className="muted mt-2 leading-7">{text}</p></article>)}</div></section>
  </main>
}
