import { Mail,MapPin,ShieldCheck,UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { EmailForm } from "@/components/email-form";
import { PasswordForm } from "@/components/password-form";
import { ProfileForm } from "@/components/profile-form";
import { Avatar,Badge,Card,PageHeader,SectionHeader,StatusBadge,Toast } from "@/components/ui/primitives";
import { getMyRoles,getMyStations,getProfile,hasAdminAccess } from "@/lib/data";

export default async function ProfilePage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const[profile,stations,roles,isAdmin,query]=await Promise.all([getProfile(),getMyStations(),getMyRoles(),hasAdminAccess(),searchParams]);
 if(!profile)redirect("/login");
 const name=`${profile.first_name} ${profile.last_name}`.trim()||"Kullanıcı";
 return <main className="shell app-shell">
  <PageHeader eyebrow="Personel profili" title="Profilim" description="Kişisel iletişim bilgilerinizi ve hesap güvenliğinizi yönetin."><StatusBadge label={profile.status==="active"?"Aktif":"Onay bekliyor"} tone={profile.status==="active"?"success":"warning"}/></PageHeader>
  {query.saved?<Toast message="Profil bilgileriniz güncellendi."/>:null}{query.error?<p className="form-error" role="alert">{query.error}</p>:null}
  <Card className="profile-hero"><Avatar name={name} src={profile.avatar_url}/><div><h2>{name}</h2><p className="muted">{roles[0]?.name||"Rol atanmamış"}</p><div className="badge-list">{stations.map(s=><Badge key={s.id}><MapPin size={13}/>{s.city} / {s.name}</Badge>)}</div></div></Card>
  <section className="dashboard-section"><SectionHeader title="Kişisel bilgiler" description="Bu alanlar yalnızca sizin ve yetkili personel yöneticilerinin erişimine açıktır."/><Card><ProfileForm profile={profile}/></Card></section>
  <section className="dashboard-section"><SectionHeader title="Çalışma bilgileri"/><div className="profile-grid"><Card className="profile-detail"><UserRound/><span><small>Sicil numarası</small><strong>{profile.employee_number||"Eklenmemiş"}</strong></span></Card><Card className="profile-detail"><ShieldCheck/><span><small>Roller</small><strong>{roles.map(r=>r.name).join(", ")||"Atanmamış"}</strong></span></Card></div></section>
  <section className="dashboard-section"><SectionHeader title="E-posta" description="Yeni adres, Supabase Auth doğrulaması tamamlanınca etkinleşir."/><Card><div className="profile-detail"><Mail/><span><small>Mevcut e-posta</small><strong>{profile.email}</strong></span></div><EmailForm currentEmail={profile.email}/></Card></section>
  <section className="dashboard-section"><SectionHeader title="Güvenlik" description="Hesap şifrenizi güvenli Supabase Auth akışıyla değiştirin."/><Card><PasswordForm/></Card></section>
  <AppNav isAdmin={isAdmin} fallbackStation={stations[0]?.slug}/>
 </main>
}
