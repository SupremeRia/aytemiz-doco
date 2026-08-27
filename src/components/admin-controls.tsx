"use client";

import { useState } from "react";
import { Plus, Save, ShieldAlert } from "lucide-react";
import type { AdminFormOptions, AdminRow, AdminSection } from "@/lib/admin-data";
import { addOperator, approveUser, createPermission, createRole, createStation, removeOperator, togglePermission, toggleRole, toggleStation, updateUserStatus } from "@/app/admin/actions";

const field = "input rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500";
const button = "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500";

export function AdminCreatePanel({ section }: { section: AdminSection }) {
  const [open, setOpen] = useState(false);
  if (!["stations", "roles", "permissions", "operators"].includes(section)) return null;
  return <section className="mt-7"><button type="button" onClick={()=>setOpen(value=>!value)} className={button}><Plus size={17}/>{open?"Formu kapat":"Yeni kayıt ekle"}</button>{open?<div className="glass mt-4 rounded-2xl p-5">{section==="stations"?<StationForm/>:section==="roles"?<RoleForm/>:section==="permissions"?<PermissionForm/>:<OperatorForm/>}</div>:null}</section>;
}

function StationForm(){return <form action={createStation} className="grid gap-3 md:grid-cols-2"><input className={field} name="name" placeholder="İstasyon adı" required/><input className={field} name="city" placeholder="Şehir" required/><input className={field} name="slug" placeholder="ornek-istasyon" pattern="[a-z0-9-]+" required/><input className={field} name="stationCode" placeholder="İstasyon kodu"/><input className={`${field} md:col-span-2`} name="address" placeholder="Adres"/><Submit label="İstasyon oluştur"/></form>}
function RoleForm(){return <form action={createRole} className="grid gap-3 md:grid-cols-2"><input className={field} name="name" placeholder="Rol adı" required/><input className={field} name="slug" placeholder="rol-slug" pattern="[a-z0-9-]+" required/><input className={`${field} md:col-span-2`} name="description" placeholder="Rol açıklaması"/><Submit label="Rol oluştur"/></form>}
function PermissionForm(){return <form action={createPermission} className="grid gap-3 md:grid-cols-2"><input className={field} name="name" placeholder="Yetki adı" required/><input className={field} name="slug" placeholder="yetki-slug" pattern="[a-z0-9-]+" required/><input className={field} name="category" placeholder="Kategori" required/><select className={field} name="scope" defaultValue="global"><option value="global">Global</option><option value="station">İstasyon</option><option value="both">Global + İstasyon</option></select><input className={`${field} md:col-span-2`} name="description" placeholder="Yetki açıklaması"/><Submit label="Yetki oluştur"/></form>}
function OperatorForm(){return <form action={addOperator} className="flex flex-col gap-3 sm:flex-row"><input className={`${field} flex-1`} type="email" name="email" placeholder="kullanici@ornek.com" required/><Submit label="OP yetkisi ver"/></form>}
function Submit({label}:{label:string}){return <button className={`${button} md:w-fit`} type="submit"><Save size={16}/>{label}</button>}

export function AdminRowControls({ section, row, options }: { section: AdminSection; row: AdminRow; options: AdminFormOptions }) {
  if(section==="pending-users") return <form action={approveUser} className="mt-4 grid w-full gap-2 border-t border-zinc-800 pt-4 sm:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="userId" value={row.id}/><select className={field} name="roleId" defaultValue=""><option value="">Rol seçilmedi</option>{options.roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select><select className={field} name="stationId" defaultValue=""><option value="">İstasyon seçilmedi</option>{options.stations.map(station=><option key={station.id} value={station.id}>{station.city} · {station.name}</option>)}</select><button className={button} type="submit" onClick={confirmClick("Kullanıcı onaylanacak. Devam edilsin mi?")}>Onayla</button></form>;
  if(section==="users") return <form action={updateUserStatus} className="flex gap-2"><input type="hidden" name="userId" value={row.id}/><select className={field} name="status" defaultValue={row.state}><option value="active">Aktif</option><option value="suspended">Askıda</option><option value="banned">Engelli</option></select><button className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold hover:bg-zinc-800" type="submit" onClick={confirmClick("Kullanıcı durumu değiştirilecek. Devam edilsin mi?")}>Kaydet</button></form>;
  if(["stations","roles","permissions"].includes(section)){const action=section==="stations"?toggleStation:section==="roles"?toggleRole:togglePermission;const active=row.state==="true";return <form action={action}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="active" value={String(!active)}/><button type="submit" onClick={confirmClick(active?"Kayıt pasife alınacak. Devam edilsin mi?":"Kayıt yeniden aktifleştirilecek. Devam edilsin mi?")} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold hover:bg-zinc-800">{active?"Pasife al":"Aktifleştir"}</button></form>}
  if(section==="operators") return <form action={removeOperator}><input type="hidden" name="id" value={row.id}/><button type="submit" onClick={confirmClick("Bu kullanıcının OP yetkisi kaldırılacak. Devam edilsin mi?")} className="inline-flex items-center gap-2 rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950"><ShieldAlert size={15}/>OP yetkisini kaldır</button></form>;
  return null;
}

function confirmClick(message:string){return (event:React.MouseEvent<HTMLButtonElement>)=>{if(!window.confirm(message))event.preventDefault()}}
