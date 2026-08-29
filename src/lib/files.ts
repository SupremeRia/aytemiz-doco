import {failDataAccess} from "@/lib/observability";
import {createSignedUrlMap} from "@/lib/storage/batch-paths";
import {createClient} from "@/lib/supabase/server";

export type StationFile={id:string;name:string;description:string|null;category:string;created_at:string;creator_name:string;media_id:string;bucket:string;storage_path:string;original_name:string;mime_type:string;size_bytes:number;can_delete:boolean;url?:string};

export async function listStationFiles(stationId:string,options:{q?:string;category?:string;cursorCreated?:string;cursorId?:string}={}){
  const supabase=await createClient();
  const[fileResult,permission]=await Promise.all([supabase.rpc("list_station_files",{target_station:stationId,search_text:options.q??null,category_filter:options.category??null,cursor_created:options.cursorCreated??null,cursor_id:options.cursorId??null,page_size:20}),supabase.rpc("can",{permission_slug:"files.upload",check_station:stationId})]);
  if(fileResult.error)failDataAccess("files.list",fileResult.error);
  if(permission.error)failDataAccess("files.permission.upload",permission.error);
  const items=(fileResult.data??[]) as StationFile[];
  let urls:Map<string,string>;
  try{urls=await createSignedUrlMap(items.map(item=>({bucket:item.bucket,path:item.storage_path})),900,(bucket,paths,expires)=>supabase.storage.from(bucket).createSignedUrls(paths,expires));}
  catch(error){failDataAccess("files.media-urls",error)}
  return{items:items.map(item=>({...item,url:urls.get(`${item.bucket}:${item.storage_path}`)})),error:null,canUpload:permission.data===true};
}
