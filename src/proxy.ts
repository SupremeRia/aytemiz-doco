import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
export async function proxy(request:NextRequest){return updateSession(request)}
export const config={matcher:["/login","/register","/pending","/dashboard/:path*","/admin/:path*","/tasks/:path*","/notifications/:path*","/profile/:path*","/station/:path*","/news/:path*","/api/push/:path*"]};
