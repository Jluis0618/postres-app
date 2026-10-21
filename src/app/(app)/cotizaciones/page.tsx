import Link from "next/link"
import { ArrowRight, Eye, MessageCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { getCustomer, orderTotals, quotes, settings } from "@/lib/demo-data"
import { whatsappLink } from "@/lib/demo"
import { formatMoney, formatShortDate, quoteStatus } from "@/lib/format"
import { ConvertQuoteDialog } from "./quote-dialogs"

export default function QuotesPage() {
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
      <div className="grid gap-4 md:grid-cols-2">
        {quotes.map((q) => {
          const customer = getCustomer(q.customer_id)
          const { total } = orderTotals(q)
          const status = quoteStatus[q.status]
          const open = q.status === "draft" || q.status === "sent"
          return (
            <Card key={q.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/cotizaciones/${q.id}`} className="group">
                    <div className="text-sm text-muted-foreground">{q.number}</div>
                    <div className="text-lg font-medium group-hover:text-primary group-hover:underline">{customer.name}</div>
                  </Link>
                  <StatusBadge {...status} />
                </div>
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {q.items.map((i, idx) => (
                    <li key={idx} className="flex justify-between gap-3">
                      <span>
                        {i.quantity} × {i.description}
                        {i.customization && <span className="text-xs"> · {i.customization}</span>}
                      </span>
                      <span className="tabular-nums">{formatMoney(i.quantity * i.unit_price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-end justify-between border-t pt-3">
                  <div className="text-xs text-muted-foreground">
                    Emitida {formatShortDate(q.issued_on)} · vence {formatShortDate(q.valid_until)}
                    {q.discount > 0 && <> · descuento {formatMoney(q.discount)}</>}
                  </div>
                  <div className="font-heading text-xl font-semibold tabular-nums">{formatMoney(total)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="h-10" asChild>
                    <Link href={`/cotizaciones/${q.id}`}>
                      <Eye /> Ver
                    </Link>
                  </Button>
                  {open && (
                    <Button variant="outline" className="h-10" asChild>
                      <a
                        href={whatsappLink(
                          customer.phone,
                          `Hola ${customer.name.split(" ")[0]}, te envío la cotización ${q.number} de ${settings.business_name} por ${formatMoney(total)}.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle /> Enviar
                      </a>
                    </Button>
                  )}
                  {open && (
                    <ConvertQuoteDialog number={q.number}>
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
    </>
  )
}
