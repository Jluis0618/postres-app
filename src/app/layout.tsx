import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { settings } from "@/lib/demo-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Títulos con un toque de repostería.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: settings.business_name,
  description: "Órdenes, inventario, cotizaciones y facturas",
};

export const viewport: Viewport = {
  themeColor: "#c0395a",
};

// Base de todas las páginas. El menú vive en (app)/layout.tsx, así el login no lo muestra.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
