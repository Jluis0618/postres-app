import { appIcon } from "@/lib/app-icon"

// Ícono de la pestaña del navegador.
export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return appIcon(64)
}
