import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "树洞 TreeHole · 学习力测评管理平台",
  description: "面向学生的学习力测评 SaaS 管理后台",
  icons: { icon: "/favicon.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "rounded-xl border-border/70",
              title: "text-sm font-medium"
            }
          }}
        />
      </body>
    </html>
  );
}
