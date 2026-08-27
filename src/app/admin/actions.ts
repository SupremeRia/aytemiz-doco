"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userError } from "@/lib/errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function value(form: FormData, key: string, max = 160) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function optionalUuid(form: FormData, key: string) {
  const result = value(form, key, 36);
  return result && UUID.test(result) ? result : null;
}

async function authorizedClient(permission?: string, stationId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: allowed } = permission
    ? await supabase.rpc("can", { permission_slug: permission, check_station: stationId ?? null })
    : await supabase.rpc("has_admin_access");
  if (!allowed) throw new Error("Bu işlem için yönetim yetkiniz yok.");
  return { supabase, user };
}

function done(section: string): never {
  revalidatePath("/admin");
  revalidatePath(`/admin/${section}`);
  redirect(`/admin/${section}?saved=1`);
}

function fail(section: string, message: string): never {
  redirect(`/admin/${section}?error=${encodeURIComponent(message.slice(0, 180))}`);
}

export async function approveUser(form: FormData) {
  const userId = value(form, "userId", 36);
  if (!UUID.test(userId)) fail("pending-users", "Geçersiz kullanıcı.");
  const { supabase } = await authorizedClient("approve_users");
  const { error } = await supabase.rpc("approve_user", { target_user: userId, target_role: optionalUuid(form, "roleId"), target_station: optionalUuid(form, "stationId") });
  if (error) fail("pending-users", userError(error));
  done("pending-users");
}

export async function updateUserStatus(form: FormData) {
  const userId = value(form, "userId", 36);
  const status = value(form, "status", 20);
  if (!UUID.test(userId) || !["active", "suspended", "banned"].includes(status)) fail("users", "Geçersiz kullanıcı işlemi.");
  const { supabase, user } = await authorizedClient("edit_users");
  if (user.id === userId && status !== "active") fail("users", "Kendi hesabınızı pasife alamazsınız.");
  const { error } = await supabase.from("profiles").update({ status, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) fail("users", userError(error));
  done("users");
}

export async function updateUserAccess(form: FormData) {
  const userId = value(form, "userId", 36);
  const status = value(form, "status", 20);
  const roleIds = form.getAll("roleIds").map(String).filter(id => UUID.test(id));
  const stationIds = form.getAll("stationIds").map(String).filter(id => UUID.test(id));
  if (!UUID.test(userId) || !["active", "suspended", "banned"].includes(status)) fail("users", "Geçersiz kullanıcı bilgisi.");
  const { supabase } = await authorizedClient("edit_users");
  const { error } = await supabase.rpc("update_user_access", {
    target_user: userId,
    new_first_name: value(form, "firstName", 80),
    new_last_name: value(form, "lastName", 80),
    new_phone: value(form, "phone", 30),
    new_employee_number: value(form, "employeeNumber", 50),
    new_status: status,
    role_ids: roleIds,
    station_ids: stationIds,
  });
  if (error) fail("users", userError(error));
  done("users");
}

export async function createStation(form: FormData) {
  const name = value(form, "name"); const city = value(form, "city", 80); const slug = value(form, "slug", 100).toLowerCase();
  if (!name || !city || !SLUG.test(slug)) fail("stations", "Ad, şehir ve tireli küçük harf slug alanlarını kontrol edin.");
  const { supabase, user } = await authorizedClient("create_station");
  const { error } = await supabase.from("stations").insert({ name, city, slug, station_code: value(form, "stationCode", 40) || null, address: value(form, "address", 300) || null, created_by: user.id });
  if (error) fail("stations", userError(error));
  done("stations");
}

export async function toggleStation(form: FormData) {
  await toggleRecord(form, "stations", "stations", "edit_station");
}

export async function updateStation(form: FormData) {
  const id=value(form,"id",36);const name=value(form,"name");const city=value(form,"city",80);const slug=value(form,"slug",100).toLowerCase();
  if(!UUID.test(id)||!name||!city||!SLUG.test(slug))fail("stations","İstasyon alanlarını kontrol edin.");
  const{ supabase }=await authorizedClient("edit_station",id);
  let imageUrl:string|undefined;
  const image=form.get("image");
  if(image instanceof File&&image.size>0){
    if(image.size>5*1024*1024||!["image/jpeg","image/png","image/webp"].includes(image.type))fail("stations","Görsel JPG, PNG veya WEBP ve en fazla 5 MB olmalıdır.");
    const extension=image.type==="image/png"?"png":image.type==="image/webp"?"webp":"jpg";
    const path=`${id}/${crypto.randomUUID()}.${extension}`;
    const{error:uploadError}=await supabase.storage.from("station-images").upload(path,await image.arrayBuffer(),{contentType:image.type,cacheControl:"3600",upsert:false});
    if(uploadError)fail("stations",userError(uploadError,"Görsel yüklenemedi. Lütfen tekrar deneyin."));
    imageUrl=supabase.storage.from("station-images").getPublicUrl(path).data.publicUrl;
  }
  const changes:{[key:string]:string|null|undefined}={name,city,slug,station_code:value(form,"stationCode",40)||null,address:value(form,"address",300)||null,phone:value(form,"phone",30)||null,opening_date:value(form,"openingDate",10)||null,updated_at:new Date().toISOString()};
  if(imageUrl)changes.image_url=imageUrl;
  const{error}=await supabase.from("stations").update(changes).eq("id",id).is("deleted_at",null);
  if(error)fail("stations",userError(error));
  done("stations");
}

export async function deleteStation(form: FormData) {
  const id=value(form,"id",36);if(!UUID.test(id))fail("stations","Geçersiz istasyon.");
  const{supabase,user}=await authorizedClient("edit_station",id);
  const{error}=await supabase.from("stations").update({is_active:false,deleted_at:new Date().toISOString(),deleted_by:user.id,updated_at:new Date().toISOString()}).eq("id",id).is("deleted_at",null);
  if(error)fail("stations",userError(error));
  done("stations");
}

export async function createRole(form: FormData) {
  const name = value(form, "name"); const slug = value(form, "slug", 100).toLowerCase();
  if (!name || !SLUG.test(slug)) fail("roles", "Rol adı ve slug alanlarını kontrol edin.");
  const { supabase, user } = await authorizedClient("create_role");
  const { error } = await supabase.from("roles").insert({ name, slug, description: value(form, "description", 300) || null, created_by: user.id });
  if (error) fail("roles", userError(error));
  done("roles");
}

export async function toggleRole(form: FormData) {
  await toggleRecord(form, "roles", "roles", "edit_role");
}

export async function createPermission(form: FormData) {
  const name = value(form, "name"); const slug = value(form, "slug", 100).toLowerCase(); const scope = value(form, "scope", 20);
  if (!name || !SLUG.test(slug) || !["global", "station", "both"].includes(scope)) fail("permissions", "Yetki alanlarını kontrol edin.");
  const { supabase, user } = await authorizedClient("create_permission");
  const { error } = await supabase.from("permissions").insert({ name, slug, category: value(form, "category", 100) || "Genel", scope_type: scope, description: value(form, "description", 300) || null, created_by: user.id });
  if (error) fail("permissions", userError(error));
  done("permissions");
}

export async function togglePermission(form: FormData) {
  await toggleRecord(form, "permissions", "permissions", "edit_permission");
}

async function toggleRecord(form: FormData, table: "stations"|"roles"|"permissions", section: string, permission: string) {
  const id = value(form, "id", 36); const active = value(form, "active", 5) === "true";
  if (!UUID.test(id)) fail(section, "Geçersiz kayıt.");
  const { supabase } = await authorizedClient(permission, table==="stations"?id:undefined);
  const { error } = await supabase.from(table).update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) fail(section, userError(error));
  done(section);
}

export async function addOperator(form: FormData) {
  const email = value(form, "email", 254).toLowerCase();
  if (!email.includes("@")) fail("operators", "Geçerli bir e-posta girin.");
  const { supabase, user } = await authorizedClient("manage_operators");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("email", email).single();
  if (profileError || !profile) fail("operators", "Bu e-postayla kayıtlı kullanıcı bulunamadı.");
  const { error } = await supabase.from("system_admins").upsert({ user_id: profile.id, is_op: true, created_by: user.id }, { onConflict: "user_id" });
  if (error) fail("operators", userError(error));
  done("operators");
}

export async function removeOperator(form: FormData) {
  const id = value(form, "id", 36);
  if (!UUID.test(id)) fail("operators", "Geçersiz OP kaydı.");
  const { supabase } = await authorizedClient("manage_operators");
  const { error } = await supabase.from("system_admins").delete().eq("id", id);
  if (error) fail("operators", userError(error));
  done("operators");
}
