import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "../lib/LanguageContext";
import { SettingsProvider } from "../lib/SettingsContext";
import { HardwareProvider } from "../lib/HardwareContext";

export const metadata: Metadata = {
  title: "System Optimizer Tool V5.0",
  description: "Native Windows System Optimization, Hardware Profiler & Latency Control Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="h-full antialiased theme-dark">
      <body className="min-h-full flex flex-col">
        <SettingsProvider>
          <LanguageProvider>
            <HardwareProvider>
              {children}
            </HardwareProvider>
          </LanguageProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
