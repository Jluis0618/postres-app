import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ChevronLeft, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentPreview } from "@/components/document-preview"
import { PrintButton } from "@/components/print-button"
import { StatusBadge } from "@/components/status-badge"
import { requireStaff } from "@/lib/auth"
import { getQuote, getSettings } from "@/lib/data"
import { formatMoney, formatShortDate, quoteStatus } from "@/lib/format"
import { firstName, whatsappLink } from "@/lib/whatsapp"
import { ConvertQuoteDialog, QuoteStatusButtons } from "../quote-dialogs"

export default async function QuotePage({ params }: PageProps<"/cotizaciones/[id]">) {
  await requireStaff()
  const { id } = await params
  const [quote, settings] = await Promise.all([getQuote(id), getSettings()])
  if (!quote) notFound()

  const customer = quote.customer
  const canConvert = !quote.order_id && (quote.status === "draft" || quote.status === "sent" || quote.status === "accepted")
  const message = `Hola ${firstName(customer.name)}, te envío la cotización ${quote.number} de ${settings.business_name} por ${formatMoney(quote.total)}. Válida hasta el ${formatShortDate(quote.valid_until)}.`

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
        <div className="min-w-0">
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
            totals={quote}
            note={[quote.notes, settings.quote_note].filter(Boolean).join("\n\n")}
            stamp={quote.status === "expired" ? { label: "Vencida", className: "border-amber-500 text-amber-600" } : undefined}
          />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {canConvert && (
              <ConvertQuoteDialog quoteId={quote.id} number={quote.number} address={customer.address}>
                <Button size="lg" className="h-11">
                  Convertir en orden <ArrowRight />
                </Button>
              </ConvertQuoteDialog>
            )}
            {customer.phone && (
              <Button variant="outline" className="h-11" asChild>
                <a href={whatsappLink(customer.phone, message)} target="_blank" rel="noreferrer">
                  <MessageCircle /> Enviar por WhatsApp
                </a>
              </Button>
            )}
            <PrintButton />
            {!quote.order_id && <QuoteStatusButtons quoteId={quote.id} number={quote.number} status={quote.status} />}
            {quote.order_id && (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                Ya se convirtió en orden.{" "}
                <Link href={`/ordenes/${quote.order_id}`} className="font-medium underline">
                  Ver {quote.order?.number}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
