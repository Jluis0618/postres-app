import { appIcon } from "@/lib/app-icon"

// Ícono al "Agregar a pantalla de inicio" en iPhone y iPad.
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return appIcon(180, { maskable: true })
}
