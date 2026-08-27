import { ActiveUserGuard } from "@/components/active-user-guard";export default function Layout({children}:{children:React.ReactNode}){return <ActiveUserGuard>{children}</ActiveUserGuard>}
