import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Link2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentPreview } from "@/components/document-preview"
import { DeletePaymentButton, PaymentDialog } from "@/components/payment-dialog"
import { PrintButton } from "@/components/print-button"
import { StatusBadge } from "@/components/status-badge"
import { requireStaff } from "@/lib/auth"
import { getInvoice, getSettings } from "@/lib/data"
import { formatMoney, formatShortDate, paymentMethod, paymentStatus } from "@/lib/format"
import { firstName, whatsappLink } from "@/lib/whatsapp"
import { VoidInvoiceDialog } from "./void-invoice-dialog"

export default async function InvoicePage({ params }: PageProps<"/facturas/[id]">) {
  await requireStaff()
  const { id } = await params
  const [found, settings] = await Promise.all([getInvoice(id), getSettings()])
  if (!found) notFound()
  const { invoice, order } = found
  const customer = invoice.customer
  const voided = invoice.status === "void"
  const message =
    invoice.balance > 0
      ? `Hola ${firstName(customer.name)}, te comparto la factura ${invoice.number} de ${settings.business_name}. Total ${formatMoney(invoice.total)}, pendiente ${formatMoney(invoice.balance)}.`
      : `Hola ${firstName(customer.name)}, te comparto la factura ${invoice.number} de ${settings.business_name}. ¡Gracias por tu pago!`

  return (
    <>
      <Link href="/facturas" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Facturas
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{invoice.number}</h1>
        {voided ? <StatusBadge label="Anulada" tone="neutral" /> : <StatusBadge {...paymentStatus[invoice.payment_status]} />}
        {order.source === "commissions" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Link2 className="size-3.5" /> {order.external_ref}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <DocumentPreview
            kind="FACTURA"
            number={invoice.number}
            business={settings}
            customer={customer}
            dates={[
              { label: "Fecha", value: invoice.issued_on },
              { label: "Entrega", value: order.delivery_at },
            ]}
            items={order.items}
            totals={invoice}
            paid={voided ? undefined : invoice.paid}
            note={settings.invoice_note}
            stamp={
              voided
                ? { label: "Anulada", className: "border-neutral-500 text-neutral-600" }
                : invoice.payment_status === "paid"
                  ? { label: "Pagada", className: "border-emerald-500 text-emerald-600" }
                  : undefined
            }
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cobro</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <div className="flex justify-between">
                  <span>Pagado</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(invoice.paid)} de {formatMoney(invoice.total)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${invoice.total > 0 ? Math.min((invoice.paid / invoice.total) * 100, 100) : 0}%` }} />
                </div>
              </div>
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {paymentMethod[p.method]} · {formatShortDate(p.paid_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="tabular-nums">{formatMoney(p.amount)}</span>
                    {!voided && <DeletePaymentButton paymentId={p.id} label={`el pago de ${formatMoney(p.amount)}`} />}
                  </span>
                </div>
              ))}
              {!voided && invoice.balance > 0 && (
                <PaymentDialog orderId={order.id} reference={invoice.number} total={Number(invoice.total)} paid={invoice.paid}>
                  <Button size="lg" className="h-11">
                    Registrar pago
                  </Button>
                </PaymentDialog>
              )}
              {order.source === "commissions" && !voided && (
                <p className="rounded-lg bg-muted/70 p-3 text-xs text-muted-foreground">
                  Viene del sistema de comisiones. Cuando quede pagada, se le avisa automáticamente.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2">
              {customer.phone && (
                <Button variant="outline" className="h-11" asChild>
                  <a href={whatsappLink(customer.phone, message)} target="_blank" rel="noreferrer">
                    <MessageCircle /> Enviar por WhatsApp
                  </a>
                </Button>
              )}
              <PrintButton />
              <Button variant="ghost" className="h-11" asChild>
                <Link href={`/ordenes/${order.id}`}>Ver orden {order.number}</Link>
              </Button>
              {!voided && <VoidInvoiceDialog invoiceId={invoice.id} number={invoice.number} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
