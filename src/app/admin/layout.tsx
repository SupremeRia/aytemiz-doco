import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/data";

export default async function AdminLayout({children}:{children:React.ReactNode}){if(!await hasAdminAccess())redirect("/dashboard");return children}
