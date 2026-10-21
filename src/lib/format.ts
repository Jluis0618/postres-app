import type { OrderStatus, PaymentStatus, QuoteStatus, SupplyUnit } from "@/lib/demo-data"

const money = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** RD$2,500 */
export function formatMoney(amount: number) {
  return money.format(amount)
}

/** Cantidad de insumo legible: 2400 g → "2.4 kg", 14 unit → "14 u". */
export function formatQty(qty: number, unit: SupplyUnit) {
  const n = (v: number) => v.toLocaleString("es-DO", { maximumFractionDigits: 2 })
  if (unit === "g") return qty >= 1000 ? `${n(qty / 1000)} kg` : `${n(qty)} g`
  if (unit === "ml") return qty >= 1000 ? `${n(qty / 1000)} L` : `${n(qty)} ml`
  return `${n(qty)} u`
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function daysFromToday(iso: string) {
  const ms = startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()
  return Math.round(ms / 86_400_000)
}

/** "Hoy", "Mañana", "Ayer" o "jueves 23 oct". */
export function formatDay(iso: string) {
  const diff = daysFromToday(iso)
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Mañana"
  if (diff === -1) return "Ayer"
  const text = new Date(iso).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "short" })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatShortDate(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
  })
}

/** "3:00 pm" */
export function formatTime(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" })
    .replace(/\s*([ap])\.\s*m\./i, " $1m")
}

/** "Ana Pérez" → "AP" */
export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
}

// ---------------------------------------------------------------------------
// Etiquetas en español para los valores de la base de datos
// ---------------------------------------------------------------------------

type Tone = "neutral" | "info" | "progress" | "success" | "warning" | "danger"

export const orderStatus: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending_confirmation: { label: "Por confirmar", tone: "warning" },
  pending: { label: "Pendiente", tone: "info" },
  in_preparation: { label: "En preparación", tone: "progress" },
  ready: { label: "Lista", tone: "success" },
  delivered: { label: "Entregada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "danger" },
}

export const quoteStatus: Record<QuoteStatus, { label: string; tone: Tone }> = {
  draft: { label: "Borrador", tone: "neutral" },
  sent: { label: "Enviada", tone: "info" },
  accepted: { label: "Aceptada", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
  expired: { label: "Vencida", tone: "warning" },
}

export const paymentStatus: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: "Por cobrar", tone: "danger" },
  partial: { label: "Abonada", tone: "warning" },
  paid: { label: "Pagada", tone: "success" },
}

export const paymentMethod = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
} as const

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  progress: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}
