"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

// Abre el diálogo de impresión; desde ahí se puede "Guardar como PDF".
// Más adelante se reemplaza por un PDF generado en el servidor.
export function PrintButton({ label = "Descargar PDF" }: { label?: string }) {
  return (
    <Button variant="outline" className="h-11" onClick={() => window.print()}>
      <Download /> {label}
    </Button>
  )
}
