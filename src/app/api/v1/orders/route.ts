import { NextResponse } from "next/server"
import { apiError, requireApiKey } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin"

type Body = {
  external_ref?: string
  customer?: { name?: string; phone?: string; email?: string; address?: string }
  delivery_at?: string
  delivery_type?: "pickup" | "delivery"
  delivery_address?: string
  notes?: string
  items?: { product_id?: string; description?: string; quantity?: number; unit_price?: number; customization?: string }[]
}

/**
 * POST /api/v1/orders: el sistema de comisiones crea un pedido.
 * Llega como "Por confirmar" para que mamá lo revise. Si se manda dos veces la misma
 * external_ref, no se duplica: responde la orden que ya existe (200 en vez de 201).
 */
export async function POST(request: Request) {
  const denied = requireApiKey(request)
  if (denied) return denied

  let body: Body
  try {
    body = await request.json()
  } catch {
    return apiError("El cuerpo debe ser JSON")
  }

  const ref = body.external_ref?.trim()
  if (!ref) return apiError("Falta external_ref (el ID del pedido en tu sistema)")
  if (!body.customer?.name?.trim()) return apiError("Falta customer.name")
  if (!body.delivery_at || Number.isNaN(Date.parse(body.delivery_at))) return apiError("delivery_at debe ser una fecha ISO 8601, por ejemplo 2026-10-25T15:00:00-04:00")
  if (!Array.isArray(body.items) || body.items.length === 0) return apiError("items no puede estar vacío")
  for (const [i, item] of body.items.entries()) {
    if (!(Number(item.quantity) > 0)) return apiError(`items[${i}].quantity debe ser mayor que 0`)
    if (!item.product_id && (!item.description || item.unit_price === undefined)) {
      return apiError(`items[${i}] necesita product_id, o description y unit_price`)
    }
  }

  const supabase = createAdminClient()

  // Todos los product_id deben existir y estar activos, para no guardar un producto equivocado.
  const productIds = [...new Set(body.items.map((i) => i.product_id).filter((id): id is string => !!id))]
  if (productIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return apiError("Algún product_id no es válido")
  if (productIds.length) {
    const { data: found, error } = await supabase.from("products").select("id").in("id", productIds).eq("is_active", true)
    if (error) return apiError(error.message, 500)
    const missing = productIds.filter((id) => !found?.some((p) => p.id === id))
    if (missing.length) return apiError(`Estos productos no existen o están desactivados: ${missing.join(", ")}`)
  }

  const existing = await supabase.from("orders").select("id, number, status, total").eq("source", "commissions").eq("external_ref", ref).maybeSingle()
  if (existing.data) return NextResponse.json({ order: { ...existing.data, total: Number(existing.data.total) }, duplicate: true }, { status: 200 })

  const customer = await supabase.rpc("find_or_create_customer", {
    p_name: body.customer.name.trim(),
    p_phone: body.customer.phone ?? "",
    p_email: body.customer.email ?? null,
    p_address: body.customer.address ?? null,
  })
  if (customer.error) return apiError(customer.error.message, 500)

  const created = await supabase.rpc("create_order", {
    p_order: {
      customer_id: customer.data,
      delivery_at: body.delivery_at,
      delivery_type: body.delivery_type === "delivery" ? "delivery" : "pickup",
      delivery_address: body.delivery_address ?? body.customer.address ?? "",
      notes: body.notes ?? "",
      status: "pending_confirmation",
      source: "commissions",
      external_ref: ref,
    },
    p_items: body.items.map((i) => ({
      product_id: i.product_id ?? null,
      description: i.description ?? null,
      quantity: Number(i.quantity),
      unit_price: i.unit_price ?? null,
      customization: i.customization ?? null,
    })),
  })
  if (created.error?.code === "23505") {
    // Llegaron dos envíos iguales al mismo tiempo: se devuelve la orden que ganó.
    const again = await supabase.from("orders").select("id, number, status, total").eq("source", "commissions").eq("external_ref", ref).single()
    return NextResponse.json({ order: { ...again.data, total: Number(again.data?.total) }, duplicate: true }, { status: 200 })
  }
  if (created.error) {
    // P0001 = validación de la base (por ejemplo, un producto sin precio).
    const status = ["23502", "23503", "22P02", "P0001"].includes(created.error.code) ? 400 : 500
    return apiError(created.error.code === "22P02" ? "Algún product_id no es válido" : created.error.message, status)
  }

  const { data: order } = await supabase.from("orders").select("id, number, status, total").eq("id", created.data).single()
  return NextResponse.json({ order: { ...order, total: Number(order?.total) }, duplicate: false }, { status: 201 })
}
