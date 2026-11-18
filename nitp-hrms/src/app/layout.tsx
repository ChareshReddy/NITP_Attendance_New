import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-bricolage", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NITP People", template: "%s · NITP People" },
  description: "Attendance, leave, payroll, performance and people operations for NITP.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f7f7f5", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
