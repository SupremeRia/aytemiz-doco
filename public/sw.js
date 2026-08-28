const CACHE="aytemiz-doco-static-v2";
const STATIC=["/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));self.skipWaiting()});
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("message",event=>{if(event.data?.type==="CLEAR_PRIVATE_CACHES")event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key))))) });
self.addEventListener("push",event=>{let data={title:"Aytemiz Doco",body:"Yeni bir bildiriminiz var",url:"/notifications"};try{data={...data,...event.data.json()}}catch{}event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/icon.svg",badge:"/icon.svg",data:{url:data.url},tag:data.url||"doco-notification"}))});
self.addEventListener("notificationclick",event=>{event.notification.close();const url=event.notification.data?.url||"/notifications";event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{const match=list.find(client=>new URL(client.url).pathname===url);return match?match.focus():clients.openWindow(url)}))});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET"||request.mode==="navigate"||request.headers.get("authorization"))return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.pathname.match(/\.(?:css|js|woff2|svg|png|webp|ico)$/))return;
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok&&response.type==="basic")caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response})));
});
