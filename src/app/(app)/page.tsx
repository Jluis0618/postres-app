import Link from "next/link"
import { ArrowRight, Inbox, Plus, ShoppingCart, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderRow } from "@/components/order-row"
import { PageHeader } from "@/components/page-header"
import {
  invoices,
  lowStockSupplies,
  orders,
  orderTotals,
  salesLast14Days,
} from "@/lib/demo-data"
import { daysFromToday, formatMoney, formatQty, formatShortDate } from "@/lib/format"

export default function HomePage() {
  const upcoming = orders
    .filter((o) => !["delivered", "cancelled"].includes(o.status) && daysFromToday(o.delivery_at) <= 1)
    .sort((a, b) => a.delivery_at.localeCompare(b.delivery_at))
  const today = upcoming.filter((o) => daysFromToday(o.delivery_at) === 0)
  const tomorrow = upcoming.filter((o) => daysFromToday(o.delivery_at) === 1)
  const toConfirm = orders.filter((o) => o.status === "pending_confirmation")
  const receivable = invoices.reduce((sum, i) => sum + (i.total - i.paid), 0)
  const monthSales = salesLast14Days.reduce((sum, d) => sum + d.total, 0)
  const low = lowStockSupplies()
  const maxSale = Math.max(...salesLast14Days.map((d) => d.total))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"

  return (
    <>
      <PageHeader
        title={`${greeting} 👋`}
        description={`Hoy tienes ${today.length} entregas y ${toConfirm.length} pedidos por confirmar.`}
        actions={
          <Button size="lg" className="h-11 px-4" asChild>
            <Link href="/ordenes/nueva">
              <Plus /> Nueva orden
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entregas hoy" value={String(today.length)} hint={`${tomorrow.length} mañana`} />
        <Stat label="Por confirmar" value={String(toConfirm.length)} hint="del sistema de comisiones" highlight={toConfirm.length > 0} />
        <Stat label="Por cobrar" value={formatMoney(receivable)} hint={`${invoices.filter((i) => i.payment_status !== "paid").length} facturas`} />
        <Stat label="Ventas (14 días)" value={formatMoney(monthSales)} hint={`${invoices.length} facturas este mes`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entregas de hoy y mañana</CardTitle>
              <CardAction>
                <Button variant="ghost" asChild>
                  <Link href="/ordenes">
                    Ver todas <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-2">
              <DayLabel>Hoy</DayLabel>
              {today.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
              <DayLabel>Mañana</DayLabel>
              {tomorrow.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ventas de los últimos 14 días</CardTitle>
              <CardDescription>Total facturado por día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-1.5">
                {salesLast14Days.map((d, i) => (
                  <div key={d.date} className="group flex h-full flex-1 flex-col justify-end">
                    <div
                      title={`${formatShortDate(d.date)}: ${formatMoney(d.total)}`}
                      className={`rounded-t-md ${i === salesLast14Days.length - 1 ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"}`}
                      style={{ height: `${Math.max((d.total / maxSale) * 100, 2)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{formatShortDate(salesLast14Days[0].date)}</span>
                <span>Hoy</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="ring-amber-300/60 dark:ring-amber-800/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Inbox className="size-5 text-amber-600" /> Pedidos por confirmar
              </CardTitle>
              <CardDescription>Llegaron del sistema de comisiones</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {toConfirm.map((o) => (
                <Link
                  key={o.id}
                  href={`/ordenes/${o.id}`}
                  className="rounded-lg border p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">{o.items[0].description}</span>
                    <span className="tabular-nums">{formatMoney(orderTotals(o).total)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {o.number} · entrega {formatShortDate(o.delivery_at)}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TriangleAlert className="size-5 text-destructive" /> Insumos bajos
              </CardTitle>
              <CardDescription>{low.length} por debajo del mínimo</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {low.map((s) => (
                <div key={s.id}>
                  <div className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatQty(s.stock_on_hand, s.unit)} / {formatQty(s.min_stock, s.unit)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/70"
                      style={{ width: `${(s.stock_on_hand / s.min_stock) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" className="mt-2 h-10" asChild>
                <Link href="/inventario?tab=compras">
                  <ShoppingCart /> Ver lista de compras
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <Card size="sm" className={highlight ? "bg-amber-50 ring-amber-300/60 dark:bg-amber-950/30" : undefined}>
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  )
}

function DayLabel({ children }: { children: string }) {
  return <div className="px-3 pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</div>
}
