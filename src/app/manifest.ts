import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{return{name:"Aytemiz Doco",short_name:"Doco",description:"DOCO istasyon operasyon platformu",start_url:"/dashboard",display:"standalone",background_color:"#0b0c0f",theme_color:"#0b0c0f",orientation:"portrait-primary",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]}}
