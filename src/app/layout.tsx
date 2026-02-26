import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitor de Medicina Sem Sangue",
  description: "Sistema de monitoramento semanal de pesquisas médicas sobre tratamentos sem transfusão de sangue - Bloodless Medicine Research Monitor",
  keywords: ["medicina sem sangue", "bloodless medicine", "Patient Blood Management", "PBM", "transfusão", "pesquisa médica"],
  authors: [{ name: "Monitor de Medicina Sem Sangue" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Monitor de Medicina Sem Sangue",
    description: "Sistema de monitoramento semanal de pesquisas médicas sobre tratamentos sem transfusão de sangue",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
