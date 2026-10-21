import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Link2, MapPin, MessageCircle, Phone, Store, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getCustomer,
  getOrder,
  getProduct,
  getRecipe,
  getSupply,
  invoiceForOrder,
  orderPaid,
  orderTotals,
  settings,
  type Order,
} from "@/lib/demo-data"
import { PaymentDialog } from "@/components/payment-dialog"
import { whatsappLink } from "@/lib/demo"
import { formatDay, formatMoney, formatShortDate, formatTime, paymentMethod } from "@/lib/format"
import { OrderActions } from "./order-actions"

// Insumos que la orden descontó al pasar a preparación, según las recetas.
function consumedSupplies(order: Order) {
  const totals = new Map<string, number>()
  for (const item of order.items) {
    const recipe = getRecipe(item.product_id)
    for (const r of recipe?.items ?? []) {
      totals.set(r.supply_id, (totals.get(r.supply_id) ?? 0) + (r.quantity * item.quantity) / recipe!.recipe_yield)
    }
  }
  return [...totals].map(([id, quantity]) => {
    const s = getSupply(id)
    return { name: s.name, unit: s.unit, quantity }
  })
}

// Para la demo, el cheesecake de ORD-0014 no tiene suficiente queso crema.
const demoShortages: Record<string, { name: string; text: string }[]> = {
  o14: [{ name: "Queso crema", text: "230 g" }],
}

export default async function OrderPage({ params }: PageProps<"/ordenes/[id]">) {
  const { id } = await params
  const order = getOrder(id)
  if (!order) notFound()

  const customer = getCustomer(order.customer_id)
  const totals = orderTotals(order)
  const paid = orderPaid(order)
  const invoice = invoiceForOrder(order.id)

  return (
    <>
      <Link href="/ordenes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Órdenes
      </Link>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{order.number}</h1>
          {order.source === "commissions" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <Link2 className="size-3.5" /> Sistema de comisiones · {order.external_ref}
            </span>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">
          Entrega {formatDay(order.delivery_at).toLowerCase()} a las {formatTime(order.delivery_at)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-xl">
                    {getProduct(item.product_id).emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">
                        {item.quantity} × {item.description}
                      </span>
                      <span className="tabular-nums">{formatMoney(item.quantity * item.unit_price)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{formatMoney(item.unit_price)} c/u</div>
                    {item.customization && (
                      <div className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        ✍️ {item.customization}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Separator />
              <dl className="flex flex-col gap-1.5 text-sm">
                <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
                {totals.discount > 0 && <Row label="Descuento" value={`− ${formatMoney(totals.discount)}`} />}
                <Row label="ITBIS" value={totals.tax > 0 ? formatMoney(totals.tax) : "No aplica"} />
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="text-base font-medium">{customer.name}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" /> {customer.phone}
                </div>
                <Button variant="outline" className="mt-2 h-10 w-fit" asChild>
                  <a
                    href={whatsappLink(
                      customer.phone,
                      `Hola ${customer.name.split(" ")[0]}, te escribo de ${settings.business_name} sobre tu pedido ${order.number}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle /> Escribir por WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entrega</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 text-base font-medium">
                  {order.delivery_type === "delivery" ? <Truck className="size-4" /> : <Store className="size-4" />}
                  {order.delivery_type === "delivery" ? "Envío a domicilio" : "Retiro en el local"}
                </div>
                {order.delivery_address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" /> {order.delivery_address}
                  </div>
                )}
                {order.notes && <p className="text-muted-foreground">📝 {order.notes}</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <OrderActions
            initialStatus={order.status}
            missing={demoShortages[order.id] ?? []}
            hasInvoice={!!invoice}
            consumed={consumedSupplies(order)}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pagos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <div className="flex justify-between">
                  <span>Pagado</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(paid)} de {formatMoney(totals.total)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min((paid / totals.total) * 100, 100)}%` }} />
                </div>
              </div>
              {order.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>
                    {i === 0 && !invoice ? "Anticipo" : "Pago"} · {paymentMethod[p.method]} · {formatShortDate(p.paid_at)}
                  </span>
                  <span className="tabular-nums">{formatMoney(p.amount)}</span>
                </div>
              ))}
              {order.status !== "cancelled" && paid < totals.total && (
                <PaymentDialog reference={order.number} total={totals.total} paid={paid}>
                  <Button variant="outline" className="h-10">
                    {invoice ? "Registrar pago" : "Registrar pago o anticipo"}
                  </Button>
                </PaymentDialog>
              )}
              {invoice && (
                <p className="text-muted-foreground">
                  Factura <span className="font-medium text-foreground">{invoice.number}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
