import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TenantProvider } from "@/lib/auth/tenant-context";
import { ReactQueryProvider } from "@/lib/react-query/provider";
import { Suspense } from "react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "StyleForge—服装AI全链路品牌管理系统",
  description: "服装款式全生命周期管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="font-sans">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <ReactQueryProvider>
            <TenantProvider>{children}</TenantProvider>
          </ReactQueryProvider>
        </Suspense>
      </body>
    </html>
  );
}
