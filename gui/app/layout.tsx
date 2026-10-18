import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "../lib/LanguageContext";

export const metadata: Metadata = {
  title: "System Optimizer",
  description: "Native Windows System Optimization & Latency Control Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="h-full antialiased bg-[#050505]">
      <body className="min-h-full flex flex-col bg-[#050505]">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
