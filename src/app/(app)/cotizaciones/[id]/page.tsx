import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Check, ChevronLeft, MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoActionButton } from "@/components/demo-action-button"
import { DocumentPreview } from "@/components/document-preview"
import { PrintButton } from "@/components/print-button"
import { StatusBadge } from "@/components/status-badge"
import { getCustomer, orderTotals, quotes, settings } from "@/lib/demo-data"
import { whatsappLink } from "@/lib/demo"
import { formatMoney, formatShortDate, quoteStatus } from "@/lib/format"
import { ConvertQuoteDialog } from "../quote-dialogs"

export default async function QuotePage({ params }: PageProps<"/cotizaciones/[id]">) {
  const { id } = await params
  const quote = quotes.find((q) => q.id === id)
  if (!quote) notFound()

  const customer = getCustomer(quote.customer_id)
  const totals = orderTotals(quote)
  const open = quote.status === "draft" || quote.status === "sent"
  const message = `Hola ${customer.name.split(" ")[0]}, te envío la cotización ${quote.number} de ${settings.business_name} por ${formatMoney(totals.total)}. Válida hasta el ${formatShortDate(quote.valid_until)}.`

  return (
    <>
      <Link href="/cotizaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Cotizaciones
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{quote.number}</h1>
        <StatusBadge {...quoteStatus[quote.status]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <DocumentPreview
          kind="COTIZACIÓN"
          number={quote.number}
          business={settings}
          customer={customer}
          dates={[
            { label: "Fecha", value: quote.issued_on },
            { label: "Válida hasta", value: quote.valid_until },
          ]}
          items={quote.items}
          totals={totals}
          note={settings.quote_note}
          stamp={quote.status === "expired" ? { label: "Vencida", className: "border-amber-500 text-amber-600" } : undefined}
        />

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {open && (
                <ConvertQuoteDialog number={quote.number}>
                  <Button size="lg" className="h-11">
                    Convertir en orden <ArrowRight />
                  </Button>
                </ConvertQuoteDialog>
              )}
              <Button variant="outline" className="h-11" asChild>
                <a href={whatsappLink(customer.phone, message)} target="_blank" rel="noreferrer">
                  <MessageCircle /> Enviar por WhatsApp
                </a>
              </Button>
              <PrintButton />
              {quote.status === "draft" && (
                <DemoActionButton message={`${quote.number} marcada como enviada`}>
                  <Send /> Marcar como enviada
                </DemoActionButton>
              )}
              {open && (
                <div className="grid grid-cols-2 gap-2">
                  <DemoActionButton message={`${quote.number} aceptada`}>
                    <Check /> Aceptada
                  </DemoActionButton>
                  <DemoActionButton message={`${quote.number} rechazada`} variant="ghost" className="h-11 text-destructive hover:text-destructive">
                    <X /> Rechazada
                  </DemoActionButton>
                </div>
              )}
              {quote.status === "accepted" && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  Ya se convirtió en orden.{" "}
                  <Link href="/ordenes/o14" className="font-medium underline">
                    Ver ORD-0014
                  </Link>
                </p>
              )}
              {quote.status === "expired" && (
                <DemoActionButton message={`Se creó una copia de ${quote.number} con fecha nueva`}>
                  Duplicar con fecha nueva
                </DemoActionButton>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
