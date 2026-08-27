import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { Avatar, Card, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { getMyStations, getProfile } from "@/lib/data";

export default async function ProfilePage(){
  const[profile,stations]=await Promise.all([getProfile(),getMyStations()]);
  if(!profile)redirect("/login");
  const name=`${profile.first_name} ${profile.last_name}`.trim()||"Kullanıcı";
  return <main className="shell"><PageHeader eyebrow="Personel profili" title={name} description="Hesap ve çalışma bilgilerinizi güvenli biçimde görüntüleyin."><StatusBadge label={profile.status==="active"?"Aktif":"Onay bekliyor"} tone={profile.status==="active"?"success":"warning"}/></PageHeader><Card className="entity-card"><Avatar name={name} src={profile.avatar_url}/><div><h2>{name}</h2><p className="muted">{stations.map(s=>`${s.city} / ${s.name}`).join(", ")||"Henüz istasyon atanmamış"}</p></div></Card><section className="mt-6"><SectionHeader title="Kişisel bilgiler" description="İş bilgileri yalnızca yetkili yöneticiler tarafından değiştirilebilir."/><div className="mt-3 grid gap-3 sm:grid-cols-2"><Card className="entity-card"><Mail/><div><small className="muted">E-posta</small><p>{profile.email}</p></div></Card><Card className="entity-card"><Phone/><div><small className="muted">Telefon</small><p>{profile.phone||"Eklenmemiş"}</p></div></Card><Card className="entity-card"><UserRound/><div><small className="muted">Sicil numarası</small><p>{profile.employee_number||"Eklenmemiş"}</p></div></Card><Card className="entity-card"><ShieldCheck/><div><small className="muted">Hesap durumu</small><p>{profile.status}</p></div></Card></div></section><AppNav/></main>
}
