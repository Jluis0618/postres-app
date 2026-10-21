"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import type { ActionResult } from "@/lib/types"

/**
 * Ejecuta una acción del servidor mostrando "guardando" y un aviso con el resultado.
 * run(fn, "Mensaje de éxito") devuelve el resultado para que el componente decida qué hacer después.
 */
export function useAction() {
  const [pending, startTransition] = useTransition()

  function run<T>(fn: () => Promise<ActionResult<T>>, successMessage?: string | ((data?: T) => string)) {
    return new Promise<ActionResult<T>>((resolve) => {
      startTransition(async () => {
        try {
          const result = await fn()
          if (result.ok) {
            const message = typeof successMessage === "function" ? successMessage(result.data) : successMessage
            if (message) toast.success(message)
          } else {
            toast.error(result.error)
          }
          resolve(result)
        } catch {
          toast.error("No se pudo conectar. Revisa tu internet e intenta de nuevo.")
          resolve({ ok: false, error: "network" })
        }
      })
    })
  }

  return { pending, run }
}
