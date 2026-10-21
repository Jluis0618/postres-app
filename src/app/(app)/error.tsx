"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

// Si una página falla al leer la base de datos (sin internet, por ejemplo), se muestra esto
// en lugar de una pantalla en blanco. El menú sigue funcionando.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="text-5xl">😕</div>
      <h1 className="font-heading text-2xl font-semibold">No se pudo cargar esta página</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Revisa tu conexión a internet e intenta de nuevo.</p>
      {error.message && <p className="max-w-md rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">{error.message}</p>}
      <Button className="mt-2 h-11" onClick={reset}>
        <RefreshCw /> Intentar de nuevo
      </Button>
    </div>
  )
}
