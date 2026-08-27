"use client";
import { useEffect, useState } from "react";
export function PwaRegister(){
  const[offline,setOffline]=useState(false);
  useEffect(()=>{
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js");
    const sync=()=>setOffline(!navigator.onLine);sync();
    window.addEventListener("online",sync);window.addEventListener("offline",sync);
    return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync)};
  },[]);
  return offline?<div role="status" className="network-status">Çevrimdışısınız · kayıtlı olmayan işlemler gönderilmeyecek</div>:null;
}
