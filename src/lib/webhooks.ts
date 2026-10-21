import "server-only"
import { createHmac } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_ATTEMPTS = 8

/**
 * Envía al sistema de comisiones los avisos pendientes (cola webhook_deliveries).
 * El cuerpo va firmado: header X-Signature = "sha256=" + HMAC-SHA256(cuerpo, COMMISSIONS_WEBHOOK_SECRET).
 * Cada aviso se reserva antes de enviarlo (claim_webhook_deliveries), así dos envíos al mismo
 * tiempo no lo mandan dos veces. Si falla, se reintenta: 1, 2, 4, 8… minutos, hasta 8 intentos.
 * El receptor debe ignorar un X-Delivery-Id repetido, por si acaso.
 */
export async function deliverPendingWebhooks(options: { onlyId?: string } = {}) {
  const url = process.env.COMMISSIONS_WEBHOOK_URL
  const secret = process.env.COMMISSIONS_WEBHOOK_SECRET
  if (!url || !secret || !process.env.SUPABASE_SECRET_KEY) {
    return { sent: 0, failed: 0, skipped: "Falta configurar COMMISSIONS_WEBHOOK_URL, COMMISSIONS_WEBHOOK_SECRET o SUPABASE_SECRET_KEY" }
  }

  const supabase = createAdminClient()
  const { data: claimed, error } = await supabase.rpc("claim_webhook_deliveries", { p_limit: 20, p_id: options.onlyId ?? null })
  if (error) throw error

  let sent = 0
  let failed = 0
  for (const delivery of (claimed ?? []) as { id: string; payload: unknown; attempts: number }[]) {
    const body = JSON.stringify(delivery.payload)
    const signature = createHmac("sha256", secret).update(body).digest("hex")
    const attempts = delivery.attempts + 1
    let problem: string | null = null
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Signature": `sha256=${signature}`, "X-Delivery-Id": delivery.id },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) problem = `HTTP ${response.status}`
    } catch (e) {
      problem = e instanceof Error ? e.message : "Error de red"
    }

    const update =
      problem === null
        ? { status: "sent", attempts, sent_at: new Date().toISOString(), last_error: null }
        : {
            status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            last_error: problem,
            next_attempt_at: new Date(Date.now() + 2 ** (attempts - 1) * 60_000).toISOString(),
          }
    const { error: updateError } = await supabase.from("webhook_deliveries").update(update).eq("id", delivery.id)
    if (updateError) throw updateError
    if (problem === null) sent++
    else failed++
  }
  return { sent, failed }
}
