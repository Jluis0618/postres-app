import { toast } from "sonner"

// Aviso de "guardado" mientras la app es solo diseño. Cuando conectemos Supabase,
// cada llamada a demoSaved se reemplaza por la acción real.
export function demoSaved(message: string) {
  toast.success(message, { description: "Demostración: todavía no se guarda." })
}

/** Enlace de WhatsApp con el mensaje ya escrito. Acepta teléfonos dominicanos como 809-555-0142. */
export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "")
  const full = digits.length === 10 ? `1${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}
