import { NextResponse, type NextRequest } from "next/server"
import { requireApiKey } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/v1/orders/<external_ref>: estado de un pedido del sistema de comisiones.
// Sirve de respaldo por si algún aviso de pago no llegó.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/orders/[ref]">) {
  const denied = requireApiKey(request)
  if (denied) return denied
  const { ref } = await ctx.params

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, number, status, total, delivery_at, payments(amount), invoices(number, status, payment_status, total)")
    .eq("source", "commissions")
    .eq("external_ref", ref)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: "No existe un pedido con esa referencia" }, { status: 404 })

  const invoice = (order.invoices as { number: string; status: string; payment_status: string; total: number }[]).find((i) => i.status === "issued")
  return NextResponse.json({
    order: {
      external_ref: ref,
      number: order.number,
      status: order.status,
      delivery_at: order.delivery_at,
      total: Number(order.total),
      amount_paid: (order.payments as { amount: number }[]).reduce((s, p) => s + Number(p.amount), 0),
      invoice: invoice ? { number: invoice.number, payment_status: invoice.payment_status, total: Number(invoice.total) } : null,
    },
  })
}
