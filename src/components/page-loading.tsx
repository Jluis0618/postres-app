import { CakeSlice } from "lucide-react"

// Pantalla de carga. Cada sección la usa en su loading.tsx, y Next la muestra
// automáticamente mientras prepara la página. El menú no cambia.
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-primary/15 border-t-primary" />
        <CakeSlice className="size-7 animate-pulse text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  )
}
