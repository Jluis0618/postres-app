import { BottomNav, Sidebar } from "@/components/app-nav"
import { requireStaff } from "@/lib/auth"
import { getSettings } from "@/lib/data"

// Todas las pantallas internas: menú lateral (tablet y computadora) o barra inferior (celular).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Primero el usuario: sin rol no puede leer la configuración y debe ir a "sin acceso".
  const user = await requireStaff()
  const settings = await getSettings()
  const roleLabel = user.role === "admin" ? "Administradora" : "Ayudante"

  return (
    <>
      <Sidebar businessName={settings.business_name} userName={user.name} roleLabel={roleLabel} isAdmin={user.role === "admin"} />
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 md:pb-12 lg:px-8">{children}</main>
      </div>
      <BottomNav />
    </>
  )
}
