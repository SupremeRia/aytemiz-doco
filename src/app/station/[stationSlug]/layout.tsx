import { notFound } from "next/navigation";
import { getStation } from "@/lib/data";

export default async function StationLayout({children,params}:{children:React.ReactNode;params:Promise<{stationSlug:string}>}){const{stationSlug}=await params;if(!await getStation(stationSlug))notFound();return children}
