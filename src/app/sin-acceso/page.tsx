import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"

export const metadata = { title: "Sin acceso" }

// Usuario con cuenta pero sin rol: la administradora todavía no le dio permiso.
export default function NoAccessPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl">🔒</div>
      <h1 className="font-heading text-3xl font-semibold">Todavía no tienes acceso</h1>
      <p className="max-w-sm text-muted-foreground">
        Tu cuenta existe, pero la administradora tiene que darte permiso desde Configuración → Usuarios.
      </p>
      <form action={signOut}>
        <Button variant="outline" size="lg" className="mt-2 h-11">
          <LogOut /> Cerrar sesión
        </Button>
      </form>
    </div>
  )
}
