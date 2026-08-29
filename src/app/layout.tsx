import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const geist = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist",
  display: "swap",
  style: "normal",
  weight: "100 900",
});
export const metadata: Metadata = { title:{default:"Aytemiz Doco",template:"%s | Aytemiz Doco"}, description:"Aytemiz DOCO ekip iletişimi ve istasyon yönetimi", applicationName:"Aytemiz Doco", manifest:"/manifest.webmanifest", appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"Aytemiz Doco"} };
export const viewport: Viewport = { themeColor:"#0b0c0f", colorScheme:"dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="tr" className={geist.variable}><body><ServiceWorkerRegister />{children}</body></html>;
}
