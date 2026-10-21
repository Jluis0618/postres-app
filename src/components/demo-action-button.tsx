"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { demoSaved } from "@/lib/demo"

/** Botón de acción que, mientras la app es solo diseño, muestra el aviso de demostración. */
export function DemoActionButton({
  message,
  children,
  variant = "outline",
  className = "h-11",
}: {
  message: string
  children: ReactNode
  variant?: "outline" | "default" | "ghost" | "destructive"
  className?: string
}) {
  return (
    <Button variant={variant} className={className} onClick={() => demoSaved(message)}>
      {children}
    </Button>
  )
}
