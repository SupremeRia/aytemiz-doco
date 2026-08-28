import { createClient } from "@/lib/supabase/server";
type EffectivePermissionRow={permission_slug:string;allowed:boolean};
export async function getEffectivePermissions(stationId?:string,regionId?:string){const supabase=await createClient();const{data,error}=await supabase.rpc("get_effective_permissions",{check_station:stationId??null,check_region:regionId??null});if(error)return new Set<string>();const rows=(data??[]) as EffectivePermissionRow[];return new Set(rows.filter(row=>row.allowed).map(row=>row.permission_slug))}
