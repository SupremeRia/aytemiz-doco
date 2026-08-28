import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {notFound} from "next/navigation";
import {Button,Card,Input,PageHeader,Select,Textarea} from "@/components/ui/primitives";
import {getEditableNews} from "@/lib/news";
import {updateNewsAction} from "../../actions";

const localDate=(value:string|null)=>value?new Date(value).toISOString().slice(0,16):"";
export default async function EditNews({params}:{params:Promise<{newsId:string}>}){const{newsId}=await params,{item}=await getEditableNews(newsId);if(!item)notFound();return <main className="shell"><Link href={`/news/${newsId}`} className="back-link"><ArrowLeft size={18}/>Habere dön</Link><PageHeader eyebrow="İçerik yönetimi" title="Haberi düzenle" description="Başlık, içerik ve yayın zamanını güncelleyin."/><Card><form action={updateNewsAction} className="grid gap-4"><input type="hidden" name="newsId" value={item.id}/><label>Başlık<Input name="title" defaultValue={item.title} required/></label><label>Özet<Textarea name="summary" defaultValue={item.summary} required maxLength={500}/></label><label>İçerik<Textarea name="content" defaultValue={item.content} required rows={12}/></label><div className="form-grid"><label>Durum<Select name="status" defaultValue={item.status}><option value="draft">Taslak</option><option value="scheduled">Planlandı</option><option value="published">Yayında</option><option value="archived">Arşivlendi</option></Select></label><label>Başlangıç<Input type="datetime-local" name="publishAt" defaultValue={localDate(item.publish_at)}/></label><label>Bitiş<Input type="datetime-local" name="expiresAt" defaultValue={localDate(item.expires_at)}/></label></div><Button>Değişiklikleri kaydet</Button></form></Card></main>}
