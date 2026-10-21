/** Enlace de WhatsApp con el mensaje ya escrito. Acepta teléfonos dominicanos como 809-555-0142. */
export function whatsappLink(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "")
  const full = digits.length === 10 ? `1${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

export function firstName(name: string) {
  return name.split(" ")[0]
}
