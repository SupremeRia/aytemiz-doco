import {failDataAccess} from "@/lib/observability";
import {createSignedUrlMap} from "@/lib/storage/batch-paths";
import {createClient} from "@/lib/supabase/server";

export type DirectoryUser={user_id:string;display_name:string;email:string|null;status:string;roles:string[];stations:{id:string;name:string;city:string}[];regions:string[]};
export type OperationPost={id:string;title:string;description:string|null;status:string;created_at:string;creator_name:string;creator_roles:string[];station_id:string;station_name:string;station_slug:string;shift_name:string|null;participants:{id:string;name:string}[];media:{id:string;bucket:string;path:string;name:string;mime:string;url?:string}[];can_edit:boolean;can_delete?:boolean};

async function attachUrls(supabase:Awaited<ReturnType<typeof createClient>>,items:OperationPost[]){
  let urls:Map<string,string>;
  try{urls=await createSignedUrlMap(items.flatMap(item=>item.media.map(({bucket,path})=>({bucket,path}))),3600,(bucket,paths,expires)=>supabase.storage.from(bucket).createSignedUrls(paths,expires));}
  catch(error){failDataAccess("operations.media-urls",error)}
  return items.map(item=>({...item,media:item.media.map(media=>({...media,url:urls.get(`${media.bucket}:${media.path}`)}))}));
}

export async function getDirectory(stationId?:string,q?:string){
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("search_user_directory",{search_text:q??null,target_station:stationId??null,cursor_name:null,cursor_id:null,page_size:50});
  if(error)failDataAccess("directory.search",error);
  return(data??[]) as DirectoryUser[];
}

export async function getOperationFormData(stationId:string){
  const supabase=await createClient();
  const[people,shifts,permission]=await Promise.all([getDirectory(stationId),supabase.from("shifts").select("id,name,starts_at,ends_at").eq("is_active",true).order("sort_order"),supabase.rpc("can",{permission_slug:"status_posts.create",check_station:stationId})]);
  if(shifts.error)failDataAccess("operations.shifts",shifts.error);
  if(permission.error)failDataAccess("operations.permission.create",permission.error);
  return{people,shifts:shifts.data??[],canCreate:permission.data===true};
}

export async function listOperationPosts(options:{stationId:string;status?:string;q?:string;from?:string;to?:string;shift?:string;person?:string;quick?:string;cursorCreated?:string;cursorId?:string}){
  let from=options.from;
  if(!from&&options.quick){const now=new Date();if(options.quick==="today")from=now.toISOString().slice(0,10);if(options.quick==="week")from=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);if(options.quick==="month")from=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10)}
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("list_operation_posts",{target_station:options.stationId,status_filter:options.status??"published",search_text:options.q??null,date_from:from??null,date_to:options.to??null,target_shift:options.shift??null,target_person:options.person??null,cursor_created:options.cursorCreated??null,cursor_id:options.cursorId??null,page_size:12});
  if(error)failDataAccess("operations.list",error);
  return{items:await attachUrls(supabase,(data??[]) as OperationPost[]),error:null};
}

export async function getOperationPost(id:string){
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("get_operation_post",{target_post:id});
  if(error)failDataAccess("operations.detail",error);
  if(!data)return{post:null,error:null};
  const[post]=await attachUrls(supabase,[data as unknown as OperationPost]);
  return{post,error:null};
}
