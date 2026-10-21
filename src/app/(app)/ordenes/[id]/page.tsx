import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Link2, MapPin, MessageCircle, Phone, Store, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DeletePaymentButton, PaymentDialog } from "@/components/payment-dialog"
import { requireStaff } from "@/lib/auth"
import { getOrder, getSettings, listProducts } from "@/lib/data"
import { formatDay, formatMoney, formatShortDate, formatTime, paymentMethod } from "@/lib/format"
import { firstName, whatsappLink } from "@/lib/whatsapp"
import { OrderActions } from "./order-actions"

export default async function OrderPage({ params }: PageProps<"/ordenes/[id]">) {
  await requireStaff()
  const { id } = await params
  const [found, settings, products] = await Promise.all([getOrder(id), getSettings(), listProducts()])
  if (!found) notFound()
  const { order, consumed } = found

  const emojiById = new Map(products.map((p) => [p.id, p.emoji]))
  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0)
  const invoice = order.invoices.find((i) => i.status === "issued") ?? null
  const customer = order.customer

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
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-xl">
                    {(item.product_id && emojiById.get(item.product_id)) || "🧾"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">
                        {Number(item.quantity)} × {item.description}
                      </span>
                      <span className="tabular-nums">{formatMoney(item.total)}</span>
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
                <Row label="Subtotal" value={formatMoney(order.subtotal)} />
                {order.discount > 0 && <Row label="Descuento" value={`− ${formatMoney(order.discount)}`} />}
                <Row label="ITBIS" value={order.tax > 0 ? formatMoney(order.tax) : "No aplica"} />
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(order.total)}</dd>
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
                <Link href={`/clientes/${customer.id}`} className="text-base font-medium hover:text-primary hover:underline">
                  {customer.name}
                </Link>
                {customer.phone && (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-4" /> {customer.phone}
                    </div>
                    <Button variant="outline" className="mt-2 h-10 w-fit" asChild>
                      <a
                        href={whatsappLink(customer.phone, `Hola ${firstName(customer.name)}, te escribo de ${settings.business_name} sobre tu pedido ${order.number}.`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle /> Escribir por WhatsApp
                      </a>
                    </Button>
                  </>
                )}
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
                {order.notes && <p className="whitespace-pre-line text-muted-foreground">📝 {order.notes}</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <OrderActions orderId={order.id} status={order.status} invoice={invoice} consumed={consumed} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pagos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <div className="flex justify-between">
                  <span>Pagado</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(paid)} de {formatMoney(order.total)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${order.total > 0 ? Math.min((paid / order.total) * 100, 100) : 0}%` }} />
                </div>
              </div>
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {paymentMethod[p.method]} · {formatShortDate(p.paid_at)}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="tabular-nums">{formatMoney(p.amount)}</span>
                    <DeletePaymentButton paymentId={p.id} label={`el pago de ${formatMoney(p.amount)}`} />
                  </span>
                </div>
              ))}
              {order.status !== "cancelled" && paid < order.total && (
                <PaymentDialog orderId={order.id} reference={order.number} total={Number(order.total)} paid={paid}>
                  <Button variant="outline" className="h-10">
                    {invoice ? "Registrar pago" : "Registrar pago o anticipo"}
                  </Button>
                </PaymentDialog>
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
