import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { RegisterServiceWorker } from "@/components/register-sw";
import { APP_NAME, BRAND_COLOR } from "@/lib/brand";
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
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Órdenes, inventario, cotizaciones y facturas",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
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
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
