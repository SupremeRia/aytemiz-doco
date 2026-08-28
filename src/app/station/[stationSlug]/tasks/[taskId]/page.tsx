import Link from "next/link";
import { ArrowLeft,CheckCircle2,Clock3,Play,RotateCcw,XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { completeTaskAction,reviewTaskAction,startTaskAction } from "@/app/station/[stationSlug]/tasks/actions";
import { AppNav } from "@/components/app-nav";
import { TaskManagement } from "@/components/tasks/task-management";
import { Badge,Button,Card,FileUploader,Input,PageHeader,SectionHeader,StatusBadge,Textarea } from "@/components/ui/primitives";
import { getMyStations,hasAdminAccess } from "@/lib/data";
import { getTaskDetail,getTaskFormData } from "@/lib/tasks";

const labels:Record<string,string>={draft:"Taslak",assigned:"Bekleyen",in_progress:"Devam Ediyor",awaiting_review:"İnceleme Bekliyor",completed:"Tamamlandı",rejected:"Reddedildi",cancelled:"İptal",overdue:"Gecikmiş"};
const eventLabels:Record<string,string>={created:"Görev oluşturuldu",assigned:"Personele atandı",started:"Görev başlatıldı",evidence_added:"Kanıt eklendi",submitted:"Görev tamamlanmak üzere gönderildi",approved:"Görev onaylandı",rejected:"Görev reddedildi",edited:"Kayıt düzenlendi",cancelled:"Görev iptal edildi",reopened:"Görev yeniden açıldı"};
const format=(value:string)=>new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Istanbul"}).format(new Date(value));

export default async function TaskDetailPage({params,searchParams}:{params:Promise<{stationSlug:string;taskId:string}>;searchParams:Promise<{error?:string}>}){
 const[{stationSlug,taskId},query]=await Promise.all([params,searchParams]);
 const[{detail},isAdmin,stations]=await Promise.all([getTaskDetail(taskId),hasAdminAccess(),getMyStations()]);
 if(!detail||detail.task.station_slug!==stationSlug)notFound();
 const task=detail.task;
 const management=detail.can_edit_task?await getTaskFormData(task.station_id):null;
 return <main className="shell app-shell">
  <Link href={`/station/${stationSlug}/tasks`} className="back-link"><ArrowLeft size={18}/>Görevlere dön</Link>
  <PageHeader eyebrow={`${task.station_name} / Görev`} title={task.title} description={task.description??"Açıklama eklenmemiş."}><StatusBadge label={labels[task.effective_status]??task.effective_status} tone={task.effective_status==="completed"?"success":task.effective_status==="overdue"||task.effective_status==="rejected"?"danger":"warning"}/></PageHeader>
  {query.error?<p className="form-error" role="alert">{query.error}</p>:null}
  <div className="task-detail-grid">
   <Card><SectionHeader title="Görev bilgileri"/><dl className="detail-list"><div><dt>Atayan</dt><dd>{task.creator_name}</dd></div><div><dt>Atanan personeller</dt><dd>{detail.assignees.map(x=>x.name).join(", ")}</dd></div><div><dt>Vardiya</dt><dd>{task.shift_name?`${task.shift_name} · ${task.shift_window}`:"Belirtilmedi"}</dd></div><div><dt>Son tarih</dt><dd>{task.due_date?format(task.due_date):"Belirtilmedi"}</dd></div><div><dt>Öncelik</dt><dd><Badge tone={task.priority==="urgent"?"danger":task.priority==="important"?"warning":"neutral"}>{task.priority==="urgent"?"Acil":task.priority==="important"?"Önemli":"Normal"}</Badge></dd></div><div><dt>Kanıt</dt><dd>{task.evidence_required?task.evidence_type:"Gerekli değil"}</dd></div></dl></Card>
   <Card><SectionHeader title="Görev geçmişi"/><ol className="timeline">{detail.events.map(event=><li key={event.id}><Clock3 size={16}/><span><strong>{eventLabels[event.type]??event.type}</strong><small>{event.actor_name} · {format(event.created_at)}</small>{event.type==="rejected"&&typeof event.metadata.reason==="string"?<em>Ret sebebi: {event.metadata.reason}</em>:null}</span></li>)}</ol></Card>
  </div>
  {detail.evidence.length?<section className="dashboard-section"><SectionHeader title="Tamamlama kayıtları"/><div className="content-stack">{detail.evidence.map(e=><Card key={e.id}><div className="card-row"><strong>{e.submitter_name}</strong>{e.edited_at?<Badge>Düzenlendi</Badge>:null}</div><p>{e.description??"Açıklama eklenmedi."}</p><time className="muted">Yapıldığı saat: {format(e.completed_at)}</time></Card>)}</div></section>:null}
  {(detail.can_edit_task||detail.can_reopen_task||detail.can_delete_task)?<TaskManagement detail={detail} stationSlug={stationSlug} shifts={management?.shifts??[]}/>:null}
  <section className="sticky-actions">
   {detail.can_start?<form action={startTaskAction}><input type="hidden" name="taskId" value={taskId}/><input type="hidden" name="stationSlug" value={stationSlug}/><Button><Play size={18}/>Göreve Başla</Button></form>:null}
   {detail.can_complete?<details><summary className="ui-button ui-button--primary"><CheckCircle2 size={18}/>Görevi Tamamla</summary><Card><form action={completeTaskAction} className="form-stack"><input type="hidden" name="taskId" value={taskId}/><input type="hidden" name="stationId" value={task.station_id}/><input type="hidden" name="stationSlug" value={stationSlug}/><label><span>Yapılan işlem</span><Textarea name="description" required={task.evidence_required&&["description","photo_and_description"].includes(task.evidence_type)}/></label><label><span>Yapıldığı saat</span><Input name="completedAt" type="datetime-local"/><small className="muted">Boş bırakırsanız sunucu saati kullanılır.</small></label><FileUploader name="photos" accept="image/jpeg,image/png,image/webp" capture="environment" multiple required={task.evidence_required&&["photo","photo_and_description"].includes(task.evidence_type)}/><Button>Tamamla ve gönder</Button></form></Card></details>:null}
   {detail.can_review?<><form action={reviewTaskAction}><input type="hidden" name="taskId" value={taskId}/><input type="hidden" name="stationSlug" value={stationSlug}/><input type="hidden" name="decision" value="approve"/><Button><CheckCircle2 size={18}/>Onayla</Button></form><details><summary className="ui-button ui-button--danger"><XCircle size={18}/>Reddet</summary><Card><form action={reviewTaskAction} className="form-stack"><input type="hidden" name="taskId" value={taskId}/><input type="hidden" name="stationSlug" value={stationSlug}/><input type="hidden" name="decision" value="reject"/><label><span>Ret sebebi</span><Textarea name="reason" required maxLength={500}/></label><Button variant="danger"><RotateCcw size={18}/>Reddet ve geri gönder</Button></form></Card></details></>:null}
  </section>
  <AppNav isAdmin={isAdmin} fallbackStation={stations[0]?.slug}/>
 </main>
}
