import "server-only";
import {after} from "next/server";
import webpush from "web-push";
import {createClient} from "@supabase/supabase-js";
import {mapWithConcurrency} from "@/lib/concurrency";

const pushTypes=["task_assigned","task_rejected","task_approved","task_review","announcement_created","handover_submitted","critical_issue","issue_assigned"];

export async function dispatchEntityPush(entityType:string,entityId:string){
  after(async()=>{try{await performEntityPush(entityType,entityId)}catch(error){console.error("[push.dispatch]",{operation:"entity-push",entityType,code:error&&typeof error==="object"&&"code" in error?String(error.code):"unknown"})}});
  return{queued:true};
}

async function performEntityPush(entityType:string,entityId:string){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
  if(!url||!key||!publicKey||!privateKey||!subject)return{sent:0,configured:false};
  webpush.setVapidDetails(subject,publicKey,privateKey);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data:notifications,error:notificationError}=await admin.from("notifications").select("user_id,title,body,action_url,severity").eq("entity_type",entityType).eq("entity_id",entityId).in("type",pushTypes);
  if(notificationError)throw notificationError;
  if(!notifications?.length)return{sent:0,configured:true};
  const users=[...new Set(notifications.map(item=>item.user_id))];
  const{data:subscriptions,error:subscriptionError}=await admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id",users).is("revoked_at",null);
  if(subscriptionError)throw subscriptionError;
  const notificationByUser=new Map(notifications.map(item=>[item.user_id,item]));
  let sent=0;
  await mapWithConcurrency(subscriptions??[],5,async subscription=>{
    const notification=notificationByUser.get(subscription.user_id);if(!notification)return;
    try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:notification.title,body:notification.body,url:notification.action_url,severity:notification.severity}),{TTL:3600,urgency:notification.severity==="urgent"?"high":"normal"});sent++;await admin.from("push_subscriptions").update({last_used_at:new Date().toISOString()}).eq("id",subscription.id)}catch(error){const status=(error as {statusCode?:number}).statusCode;if(status===404||status===410)await admin.from("push_subscriptions").update({revoked_at:new Date().toISOString()}).eq("id",subscription.id)}
  });
  return{sent,configured:true};
}
