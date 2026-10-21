import { ImageResponse } from "next/og"
import { BRAND_COLOR } from "@/lib/brand"

/**
 * Ícono de la app (una torta) dibujado con formas simples, así no depende de imágenes externas.
 * maskable: sin esquinas redondeadas y con más margen, para Android (lo recorta en círculo).
 */
export function appIcon(size: number, { maskable = false } = {}) {
  const s = (n: number) => Math.round(n * size * (maskable ? 0.8 : 1))
  const layer = (width: number, height: number, color: string) => (
    <div style={{ width: s(width), height: s(height), background: color, borderRadius: s(0.025) }} />
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLOR,
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: s(0.12), height: s(0.12), borderRadius: s(0.06), background: "#ffd6e0", marginBottom: s(0.02) }} />
          {layer(0.42, 0.1, "#fff7ed")}
          <div style={{ height: s(0.025) }} />
          {layer(0.5, 0.12, "#ffffff")}
          <div style={{ height: s(0.025) }} />
          {layer(0.58, 0.13, "#fff7ed")}
          <div style={{ width: s(0.7), height: s(0.035), background: "#ffffff", opacity: 0.6, borderRadius: s(0.02), marginTop: s(0.02) }} />
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
