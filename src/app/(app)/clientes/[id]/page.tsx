import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Mail, MapPin, MessageCircle, Pencil, Phone, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderRow } from "@/components/order-row"
import { customers, invoices, orders, orderTotals, settings } from "@/lib/demo-data"
import { whatsappLink } from "@/lib/demo"
import { formatMoney, initials } from "@/lib/format"
import { CustomerDialog } from "../customer-dialog"

export default async function CustomerPage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params
  const customer = customers.find((c) => c.id === id)
  if (!customer) notFound()

  const theirs = orders
    .filter((o) => o.customer_id === customer.id)
    .sort((a, b) => b.delivery_at.localeCompare(a.delivery_at))
  const active = theirs.filter((o) => o.status !== "cancelled")
  const spent = active.reduce((sum, o) => sum + orderTotals(o).total, 0)
  const owed = invoices.filter((i) => i.customer_id === customer.id).reduce((sum, i) => sum + (i.total - i.paid), 0)

  return (
    <>
      <Link href="/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent font-heading text-2xl font-semibold text-accent-foreground">
          {initials(customer.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Phone className="size-4" /> {customer.phone}
            </span>
            {customer.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" /> {customer.email}
              </span>
            )}
            {customer.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {customer.address}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CustomerDialog customer={customer}>
            <Button variant="outline" className="h-11">
              <Pencil /> Editar
            </Button>
          </CustomerDialog>
          <Button variant="outline" className="h-11" asChild>
            <a href={whatsappLink(customer.phone, `Hola ${customer.name.split(" ")[0]}, te escribo de ${settings.business_name}.`)} target="_blank" rel="noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          </Button>
          <Button className="h-11" asChild>
            <Link href="/ordenes/nueva">
              <Plus /> Nueva orden
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Órdenes" value={String(active.length)} />
        <Stat label="Ha comprado" value={formatMoney(spent)} />
        <Stat label="Debe" value={formatMoney(owed)} highlight={owed > 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de órdenes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col px-2">
          {theirs.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
          {theirs.length === 0 && <p className="py-8 text-center text-muted-foreground">Todavía no tiene órdenes.</p>}
        </CardContent>
      </Card>
    </>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card size="sm" className={highlight ? "bg-rose-50 dark:bg-rose-950/30" : undefined}>
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 font-heading text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      </CardContent>
    </Card>
  )
}
