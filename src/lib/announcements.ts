import { failDataAccess } from "@/lib/observability";
import { createSignedUrlMap } from "@/lib/storage/batch-paths";
import { createClient } from "@/lib/supabase/server";

export type Announcement={id:string;title:string;body:string;severity:"normal"|"important"|"urgent";scope_kind:string;station_id:string|null;station_name:string|null;region_id:string|null;region_name:string|null;status:string;published_at:string|null;created_at:string;creator_name:string;creator_roles:string[];is_read:boolean;read_count:number;recipient_count:number;media:{id:string;bucket:string;path:string;name:string;mime:string;kind:string;url?:string}[];can_edit?:boolean;can_delete?:boolean};

async function attachUrls(supabase:Awaited<ReturnType<typeof createClient>>,items:Announcement[]){
  let urls:Map<string,string>;
  try{urls=await createSignedUrlMap(items.flatMap(item=>item.media.map(({bucket,path})=>({bucket,path}))),3600,(bucket,paths,expires)=>supabase.storage.from(bucket).createSignedUrls(paths,expires));}
  catch(error){failDataAccess("announcements.media-urls",error)}
  return items.map(item=>({...item,media:item.media.map(media=>({...media,url:urls.get(`${media.bucket}:${media.path}`)}))}));
}

export async function listAnnouncements(stationId:string,options:{q?:string;severity?:string;unread?:boolean}={}){
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("list_announcements",{target_station:stationId,search_text:options.q??null,severity_filter:options.severity??null,unread_only:options.unread??false,cursor_published:null,cursor_id:null,page_size:20});
  if(error)failDataAccess("announcements.list",error);
  return{items:await attachUrls(supabase,(data??[]) as Announcement[]),error:null};
}

export async function getAnnouncement(id:string){
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("get_announcement_detail",{target_announcement:id});
  if(error)failDataAccess("announcements.detail",error);
  if(!data)return{item:null,error:null};
  const item=data as unknown as Announcement;
  const[userResult,rowResult,permissionResult]=await Promise.all([supabase.auth.getUser(),supabase.from("announcements").select("created_by").eq("id",id).maybeSingle(),supabase.rpc("get_effective_permissions",{check_station:item.station_id,check_region:item.region_id})]);
  if(userResult.error)failDataAccess("announcements.user",userResult.error);
  if(rowResult.error)failDataAccess("announcements.owner",rowResult.error);
  if(permissionResult.error)failDataAccess("announcements.permissions",permissionResult.error);
  const allowed=new Set(((permissionResult.data??[]) as {permission_slug:string;allowed:boolean}[]).filter(x=>x.allowed).map(x=>x.permission_slug));
  const[resolved]=await attachUrls(supabase,[{...item,can_edit:allowed.has("announcements.edit_any")||(rowResult.data?.created_by===userResult.data.user?.id&&allowed.has("announcements.edit_own")),can_delete:allowed.has("announcements.delete")}]);
  return{item:resolved,error:null};
}

export async function getAnnouncementFormData(stationId:string){
  const supabase=await createClient();
  const[permission,regions]=await Promise.all([supabase.rpc("can",{permission_slug:"announcements.create",check_station:stationId}),supabase.from("regions").select("id,name").eq("is_active",true).order("name")]);
  if(permission.error)failDataAccess("announcements.permission.create",permission.error);
  if(regions.error)failDataAccess("announcements.regions",regions.error);
  return{canCreate:permission.data===true,regions:regions.data??[]};
}
