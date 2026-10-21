import Link from "next/link"
import { ArrowRight, Eye, MessageCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { requireStaff } from "@/lib/auth"
import { getSettings, listQuotes } from "@/lib/data"
import { formatMoney, formatShortDate, quoteStatus } from "@/lib/format"
import { firstName, whatsappLink } from "@/lib/whatsapp"
import { ConvertQuoteDialog } from "./quote-dialogs"

export const metadata = { title: "Cotizaciones" }

export default async function QuotesPage() {
  await requireStaff()
  const [quotes, settings] = await Promise.all([listQuotes(), getSettings()])

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        description="Propuestas de precio para enviar al cliente"
        actions={
          <Button size="lg" className="h-11 px-4" asChild>
            <Link href="/cotizaciones/nueva">
              <Plus /> Nueva cotización
            </Link>
          </Button>
        }
      />
      {quotes.length === 0 ? (
        <EmptyState
          emoji="📝"
          title="Todavía no hay cotizaciones"
          description="Crea una, envíala por WhatsApp y, cuando el cliente acepte, conviértela en orden con un toque."
          action={
            <Button size="lg" className="h-11" asChild>
              <Link href="/cotizaciones/nueva">
                <Plus /> Nueva cotización
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quotes.map((q) => {
            const open = !q.order_id && (q.status === "draft" || q.status === "sent")
            return (
              <Card key={q.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/cotizaciones/${q.id}`} className="group min-w-0">
                      <div className="text-sm text-muted-foreground">{q.number}</div>
                      <div className="truncate text-lg font-medium group-hover:text-primary group-hover:underline">{q.customer.name}</div>
                    </Link>
                    <StatusBadge {...quoteStatus[q.status]} />
                  </div>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {q.items.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3">
                        <span>
                          {Number(i.quantity)} × {i.description}
                          {i.customization && <span className="text-xs"> · {i.customization}</span>}
                        </span>
                        <span className="tabular-nums">{formatMoney(i.total)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-end justify-between border-t pt-3">
                    <div className="text-xs text-muted-foreground">
                      Emitida {formatShortDate(q.issued_on)} · vence {formatShortDate(q.valid_until)}
                      {q.discount > 0 && <> · descuento {formatMoney(q.discount)}</>}
                    </div>
                    <div className="font-heading text-xl font-semibold tabular-nums">{formatMoney(q.total)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="h-10" asChild>
                      <Link href={`/cotizaciones/${q.id}`}>
                        <Eye /> Ver
                      </Link>
                    </Button>
                    {open && q.customer.phone && (
                      <Button variant="outline" className="h-10" asChild>
                        <a
                          href={whatsappLink(
                            q.customer.phone,
                            `Hola ${firstName(q.customer.name)}, te envío la cotización ${q.number} de ${settings.business_name} por ${formatMoney(q.total)}.`
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle /> Enviar
                        </a>
                      </Button>
                    )}
                    {open && (
                      <ConvertQuoteDialog quoteId={q.id} number={q.number} address={q.customer.address}>
                        <Button className="h-10">
                          Convertir en orden <ArrowRight />
                        </Button>
                      </ConvertQuoteDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
