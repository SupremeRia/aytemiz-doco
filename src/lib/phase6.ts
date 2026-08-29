import {getStation} from "@/lib/data";
import {failDataAccess} from "@/lib/observability";
import {createClient} from "@/lib/supabase/server";

export async function stationContext(slug:string){const station=await getStation(slug);if(!station)return null;const supabase=await createClient();return{station,supabase}}
export type Phase6Person={user_id:string;first_name:string;last_name:string;role_name:string|null};

export async function handoverData(slug:string){
  const context=await stationContext(slug);if(!context)return null;
  const[shifts,handovers,personnel]=await Promise.all([context.supabase.from("shifts").select("id,name,starts_at,ends_at").eq("is_active",true).order("sort_order"),context.supabase.from("shift_handovers").select("id,handover_date,status,general_note,next_shift_note,submitted_at,shift_id,shift_handover_items(section_key,condition,note),shift_handover_acknowledgements(user_id,acknowledged_at)").eq("station_id",context.station.id).is("deleted_at",null).order("handover_date",{ascending:false}).limit(20),context.supabase.rpc("get_station_personnel",{target_station:context.station.id})]);
  if(shifts.error)failDataAccess("phase6.handover.shifts",shifts.error);if(handovers.error)failDataAccess("phase6.handovers",handovers.error);if(personnel.error)failDataAccess("phase6.handover.personnel",personnel.error);
  return{...context,shifts:shifts.data??[],handovers:handovers.data??[],personnel:(personnel.data??[]) as Phase6Person[]};
}

export async function checklistData(slug:string,date:string){
  const context=await stationContext(slug);if(!context)return null;
  const ensured=await context.supabase.rpc("ensure_checklist_runs",{target_station:context.station.id,target_date:date,target_shift:null});if(ensured.error)failDataAccess("phase6.checklist.ensure",ensured.error);
  const runs=await context.supabase.from("checklist_runs").select("id,status,run_date,started_at,completed_at,checklist_templates(name,description),checklist_run_items(id,status,note,checklist_template_items(title,description,is_required,requires_note,requires_photo))").eq("station_id",context.station.id).eq("run_date",date).order("created_at");if(runs.error)failDataAccess("phase6.checklist.runs",runs.error);
  const normalized=(runs.data??[]).map(run=>({...run,checklist_templates:Array.isArray(run.checklist_templates)?run.checklist_templates[0]:run.checklist_templates,checklist_run_items:(run.checklist_run_items??[]).map(item=>({...item,checklist_template_items:Array.isArray(item.checklist_template_items)?item.checklist_template_items[0]:item.checklist_template_items}))}));
  return{...context,runs:normalized};
}

export async function issueData(slug:string){
  const context=await stationContext(slug);if(!context)return null;
  const[issues,personnel]=await Promise.all([context.supabase.from("station_issues").select("id,title,description,category,priority,status,assigned_to,opened_at,resolved_at,station_issue_events(id,event_type,body,created_at)").eq("station_id",context.station.id).is("deleted_at",null).order("opened_at",{ascending:false}).limit(40),context.supabase.rpc("get_station_personnel",{target_station:context.station.id})]);
  if(issues.error)failDataAccess("phase6.issues",issues.error);if(personnel.error)failDataAccess("phase6.issue.personnel",personnel.error);
  return{...context,issues:issues.data??[],personnel:(personnel.data??[]) as Phase6Person[]};
}

export async function dailyReportData(slug:string,date:string){
  const context=await stationContext(slug);if(!context)return null;
  const[summary,notes]=await Promise.all([context.supabase.rpc("get_station_operations",{target_station:context.station.id,target_date:date}),context.supabase.from("station_daily_report_notes").select("id,content,created_at,created_by").eq("station_id",context.station.id).eq("report_date",date).is("deleted_at",null).order("created_at",{ascending:false})]);
  if(summary.error)failDataAccess("phase6.daily.summary",summary.error);if(notes.error)failDataAccess("phase6.daily.notes",notes.error);
  return{...context,summary:(summary.data??{}) as Record<string,number>,notes:notes.data??[]};
}

export async function operationsSummary(stationId:string){const supabase=await createClient();const{data,error}=await supabase.rpc("get_station_operations",{target_station:stationId,target_date:new Date().toISOString().slice(0,10)});if(error)failDataAccess("phase6.operations.summary",error);return(data??{}) as Record<string,number>}
