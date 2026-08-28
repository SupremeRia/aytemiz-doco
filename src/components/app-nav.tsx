import {AppNavClient} from "@/components/app-nav-client";import {createClient} from "@/lib/supabase/server";
export async function AppNav(props:{isAdmin?:boolean;fallbackStation?:string}){const supabase=await createClient();const{data}=await supabase.rpc("notification_unread_count");return <AppNavClient {...props} unreadCount={Number(data??0)}/>}
