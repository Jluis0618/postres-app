"use server"

import { after } from "next/server"
import { deliverPendingWebhooks } from "@/lib/webhooks"
import type { ActionResult, DeliveryType, Missing, OrderStatus, PaymentMethod, QuoteStatus } from "@/lib/types"
import { must, run, sessionClient } from "./helpers"

type ItemInput = { product_id: string | null; description: string; quantity: number; unit_price: number; customization: string }

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function saveCustomer(input: {
  id?: string
  name: string
  phone: string
  email: string
  address: string
  tax_id: string
  notes: string
}) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!input.name.trim()) throw new Error("Escribe el nombre del cliente")
    const row = {
      name: input.name.trim(),
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      address: input.address.trim() || null,
      tax_id: input.tax_id.trim() || null,
      notes: input.notes.trim() || null,
    }
    if (input.id) {
      must(await supabase.from("customers").update(row).eq("id", input.id))
      return input.id
    }
    const created = must(await supabase.from("customers").insert(row).select("id").single()) as { id: string }
    return created.id
  })
}

// ---------------------------------------------------------------------------
// Órdenes
// ---------------------------------------------------------------------------

export async function createOrder(input: {
  customer_id: string
  delivery_at: string
  delivery_type: DeliveryType
  delivery_address: string
  discount: number
  notes: string
  items: ItemInput[]
  deposit: { amount: number; method: PaymentMethod }
}) {
  return run(async () => {
    const supabase = await sessionClient()
    const { items, deposit, ...order } = input
    const id = must(await supabase.rpc("create_order", { p_order: order, p_items: items, p_deposit: deposit })) as string
    const { data } = await supabase.from("orders").select("id, number").eq("id", id).single()
    return data as { id: string; number: string }
  })
}

/** Cambios de estado simples: confirmar, marcar lista, entregada, o deshacer. */
export async function setOrderStatus(orderId: string, status: OrderStatus) {
  return run(async () => {
    const supabase = await sessionClient()
    must(await supabase.from("orders").update({ status }).eq("id", orderId))
  })
}

export async function startPreparation(orderId: string): Promise<ActionResult<{ missing?: Missing[] }>> {
  return run(async () => {
    const supabase = await sessionClient()
    const result = must(await supabase.rpc("start_order_preparation", { p_order_id: orderId })) as { ok: boolean; missing?: Missing[] }
    return result.ok ? {} : { missing: result.missing }
  })
}

export async function cancelOrder(orderId: string, waste: { supply_id: string; quantity: number }[], reason: string) {
  return run(async () => {
    const supabase = await sessionClient()
    must(await supabase.rpc("cancel_order", { p_order_id: orderId, p_waste: waste.filter((w) => w.quantity > 0) }))
    if (reason.trim()) {
      const current = must(await supabase.from("orders").select("notes").eq("id", orderId).single()) as { notes: string | null }
      const notes = [current.notes, `Cancelada: ${reason.trim()}`].filter(Boolean).join("\n")
      must(await supabase.from("orders").update({ notes }).eq("id", orderId))
    }
  })
}

export async function deleteOrder(orderId: string) {
  return run(async () => {
    const supabase = await sessionClient()
    must(await supabase.from("orders").delete().eq("id", orderId))
  })
}

export async function createInvoice(orderId: string) {
  return run(async () => {
    const supabase = await sessionClient()
    const id = must(await supabase.rpc("create_invoice", { p_order_id: orderId })) as string
    const { data } = await supabase.from("invoices").select("id, number").eq("id", id).single()
    after(deliverPendingWebhooks)
    return data as { id: string; number: string }
  })
}

export async function addPayment(input: { order_id: string; amount: number; method: PaymentMethod; reference: string }) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!(input.amount > 0)) throw new Error("El monto debe ser mayor que cero")
    must(
      await supabase.from("payments").insert({
        order_id: input.order_id,
        amount: input.amount,
        method: input.method,
        reference: input.reference.trim() || null,
      })
    )
    // Si con este pago una factura de comisiones quedó pagada, el aviso sale enseguida.
    after(deliverPendingWebhooks)
  })
}

export async function deletePayment(paymentId: string) {
  return run(async () => {
    const supabase = await sessionClient()
    must(await supabase.from("payments").delete().eq("id", paymentId))
  })
}

// ---------------------------------------------------------------------------
// Cotizaciones
// ---------------------------------------------------------------------------

export async function createQuote(input: { customer_id: string; valid_until: string; discount: number; notes: string; items: ItemInput[] }) {
  return run(async () => {
    const supabase = await sessionClient()
    const { items, ...quote } = input
    const id = must(await supabase.rpc("create_quote", { p_quote: quote, p_items: items })) as string
    const { data } = await supabase.from("quotes").select("id, number").eq("id", id).single()
    return data as { id: string; number: string }
  })
}

export async function setQuoteStatus(quoteId: string, status: QuoteStatus) {
  return run(async () => {
    const supabase = await sessionClient()
    must(await supabase.from("quotes").update({ status }).eq("id", quoteId))
  })
}

export async function convertQuote(input: { quote_id: string; delivery_at: string; delivery_type: DeliveryType; delivery_address: string }) {
  return run(async () => {
    const supabase = await sessionClient()
    const id = must(
      await supabase.rpc("convert_quote_to_order", {
        p_quote_id: input.quote_id,
        p_delivery_at: input.delivery_at,
        p_delivery_type: input.delivery_type,
        p_delivery_address: input.delivery_address || null,
      })
    ) as string
    const { data } = await supabase.from("orders").select("id, number").eq("id", id).single()
    return data as { id: string; number: string }
  })
}

/** Copia una cotización (por ejemplo, una vencida) con fecha nueva. */
export async function duplicateQuote(quoteId: string) {
  return run(async () => {
    const supabase = await sessionClient()
    const q = must(await supabase.from("quotes").select("*, items:quote_items(*)").eq("id", quoteId).single()) as {
      customer_id: string
      discount: number
      notes: string | null
      items: ItemInput[]
    }
    const id = must(
      await supabase.rpc("create_quote", {
        p_quote: { customer_id: q.customer_id, discount: q.discount, notes: q.notes },
        p_items: q.items.map((i) => ({
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          customization: i.customization,
        })),
      })
    ) as string
    return id
  })
}

// ---------------------------------------------------------------------------
// Facturas
// ---------------------------------------------------------------------------

export async function voidInvoice(invoiceId: string, reason: string) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!reason.trim()) throw new Error("Escribe el motivo")
    const current = must(await supabase.from("invoices").select("notes").eq("id", invoiceId).single()) as { notes: string | null }
    const notes = [current.notes, `Anulada: ${reason.trim()}`].filter(Boolean).join("\n")
    must(await supabase.from("invoices").update({ status: "void", notes }).eq("id", invoiceId))
  })
}
