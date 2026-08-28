"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {Reply,Send,Trash2} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import type {ChatMessage} from "@/lib/chat";
import {deleteMessageAction,editMessageAction,sendMessageAction} from "@/app/station/[stationSlug]/general/actions";
import {Button,Card,Textarea} from "@/components/ui/primitives";
import {queueMutation,removeDraft,saveDraft} from "@/lib/offline-store";

const time=(value:string)=>new Intl.DateTimeFormat("tr-TR",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Istanbul"}).format(new Date(value));

export function ChatRoom({stationId,stationSlug,initial}:{stationId:string;stationSlug:string;initial:ChatMessage[]}){
  const [items,setItems]=useState(initial);
  const [reply,setReply]=useState<ChatMessage|null>(null);
  const [message,setMessage]=useState("");
  const [offlineNotice,setOfflineNotice]=useState(false);
  useEffect(()=>{const supabase=createClient();const channel=supabase.channel(`station-chat:${stationId}`).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:`station_id=eq.${stationId}`},async()=>{const {data}=await supabase.rpc("list_messages",{target_station:stationId,search_text:null,cursor_created:null,cursor_id:null,page_size:40});setItems(current=>{const map=new Map(current.map(item=>[item.id,item]));for(const row of(data??[]) as ChatMessage[])map.set(row.id,row);return [...map.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at))})}).subscribe();return()=>{void supabase.removeChannel(channel)}},[stationId]);
  useEffect(()=>{const timer=setTimeout(()=>void saveDraft({kind:"chat",stationId,value:{message},updatedAt:Date.now()}),350);return()=>clearTimeout(timer)},[stationId,message]);
  async function submit(formData:FormData){if(!navigator.onLine){await queueMutation("chat",stationId,{message,replyTo:reply?.id??""});setOfflineNotice(true);setMessage("");setReply(null);await removeDraft("chat",stationId);return}formData.set("idempotencyKey",crypto.randomUUID());await sendMessageAction(formData);setMessage("");setReply(null);setOfflineNotice(false);await removeDraft("chat",stationId)}
  return <><Card className="chat-guidance"><strong>Genel ekip sohbeti</strong><p className="muted">Resmi duyurular için Duyurular, iş kanıtları için Fotoğraflar ve atamalar için Görevler modülünü kullanın.</p><Link href={`/station/${stationSlug}/photos`} className="back-link">Operasyon kaydı oluştur</Link></Card>{offlineNotice?<p className="online-banner">Mesaj cihazınızda beklemeye alındı. Güvenlik nedeniyle otomatik yayınlanmaz; bağlantı gelince yeniden onaylayın.</p>:null}<div className="chat-list" aria-live="polite">{items.map(item=><article key={item.id} className={`chat-message ${item.is_mine?"chat-message--mine":""}`}><div className="chat-message-head"><strong>{item.sender_name}</strong><small>{item.sender_roles.join(" + ")||"Personel"} · {time(item.created_at)}</small></div>{item.reply_preview?<blockquote>{item.reply_preview}</blockquote>:null}<p className={item.deleted_at?"muted italic":""}>{item.message}</p>{!item.deleted_at?<div className="chat-actions"><button type="button" onClick={()=>setReply(item)}><Reply size={14}/>Yanıtla</button>{item.can_edit?<details><summary>Düzenle</summary><form action={editMessageAction}><input type="hidden" name="stationSlug" value={stationSlug}/><input type="hidden" name="messageId" value={item.id}/><Textarea name="message" defaultValue={item.message}/><Button>Kaydet</Button></form></details>:null}{item.can_delete?<form action={deleteMessageAction}><input type="hidden" name="stationSlug" value={stationSlug}/><input type="hidden" name="messageId" value={item.id}/><button><Trash2 size={14}/>Sil</button></form>:null}</div>:null}</article>)}</div><form action={submit} className="chat-composer"><input type="hidden" name="stationSlug" value={stationSlug}/><input type="hidden" name="stationId" value={stationId}/><input type="hidden" name="replyTo" value={reply?.id??""}/>{reply?<p className="muted">Yanıt: {reply.sender_name} · <button type="button" onClick={()=>setReply(null)}>İptal</button></p>:null}<Textarea name="message" value={message} onChange={event=>setMessage(event.target.value)} required placeholder="Ekibinize mesaj yazın… 😊"/><Button disabled={!message.trim()}><Send size={18}/>Gönder</Button></form></>;
}
