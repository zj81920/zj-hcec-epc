import type { Metadata } from "next";
import { Toaster } from "sonner";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPC 项目管理系统",
  description: "石油化工EPC项目管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <UserProvider>
          {children}
        </UserProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
