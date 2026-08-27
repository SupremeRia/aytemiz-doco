import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const metadata: Metadata = { title:{default:"Aytemiz Doco",template:"%s | Aytemiz Doco"}, description:"Aytemiz DOCO ekip iletişimi ve istasyon yönetimi", applicationName:"Aytemiz Doco", manifest:"/manifest.webmanifest", appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"Aytemiz Doco"} };
export const viewport: Viewport = { themeColor:"#0b0c0f", colorScheme:"dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="tr" className={geist.variable}><body><PwaRegister />{children}</body></html>;
}
