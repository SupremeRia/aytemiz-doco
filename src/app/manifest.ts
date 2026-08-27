import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{return{name:"Aytemiz Doco",short_name:"Doco",description:"DOCO istasyon ekip platformu",start_url:"/dashboard",display:"standalone",background_color:"#09090b",theme_color:"#09090b",orientation:"portrait-primary",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]}}
