import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";

export default async function DashboardLayout({children}:{children:React.ReactNode}){const profile=await getProfile();if(!profile)redirect("/login");if(profile.status!=="active")redirect("/pending");return children}
