import { BottomNav, Sidebar } from "@/components/app-nav"
import { settings } from "@/lib/demo-data"

// Todas las pantallas internas: menú lateral (tablet y computadora) o barra inferior (celular).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar businessName={settings.business_name} />
      <div className="md:pl-60">
        <div className="bg-accent px-4 py-1.5 text-center text-xs text-accent-foreground">
          Vista de demostración con datos de ejemplo. Todavía no está conectada a Supabase.
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 md:pb-12 lg:px-8">{children}</main>
      </div>
      <BottomNav />
    </>
  )
}
