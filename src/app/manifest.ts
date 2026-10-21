import type { MetadataRoute } from "next"
import { APP_NAME, BRAND_COLOR } from "@/lib/brand"

// Lo que hace que la app se pueda instalar en el celular y la tablet.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME.length > 12 ? "Postres" : APP_NAME,
    description: "Órdenes, inventario, cotizaciones y facturas",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fbf8f4",
    theme_color: BRAND_COLOR,
    lang: "es-DO",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
