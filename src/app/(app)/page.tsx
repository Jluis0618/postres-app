import Link from "next/link"
import { ArrowRight, CircleCheck, Inbox, Plus, ShoppingCart, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderRow } from "@/components/order-row"
import { PageHeader } from "@/components/page-header"
import { requireStaff } from "@/lib/auth"
import { listLowStock, listOrders, listReceivables, salesByDay } from "@/lib/data"
import { addDays, dayKey, formatMoney, formatQty, formatShortDate, TIME_ZONE } from "@/lib/format"
import type { Order } from "@/lib/types"

export const metadata = { title: "Inicio" }

export default async function HomePage() {
  const user = await requireStaff()
  const today = dayKey(new Date())
  const tomorrow = addDays(today, 1)

  const [open, toConfirm, receivables, sales, low] = await Promise.all([
    listOrders({ excludeStatuses: ["delivered", "cancelled", "pending_confirmation"], toDay: tomorrow }),
    listOrders({ statuses: ["pending_confirmation"] }),
    listReceivables(),
    salesByDay(addDays(today, -13)),
    listLowStock(),
  ])

  const late = open.filter((o) => dayKey(o.delivery_at) < today)
  const todays = open.filter((o) => dayKey(o.delivery_at) === today)
  const tomorrows = open.filter((o) => dayKey(o.delivery_at) === tomorrow)
  const owed = receivables.reduce((s, r) => s + Number(r.balance), 0)
  const salesTotal = sales.reduce((s, d) => s + d.total, 0)
  const maxSale = Math.max(...sales.map((d) => d.total), 1)

  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TIME_ZONE }))
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"
  const first = user.name.split(" ")[0]

  return (
    <>
      <PageHeader
        title={`${greeting}, ${first} 👋`}
        description={`Hoy tienes ${todays.length} ${todays.length === 1 ? "entrega" : "entregas"}${toConfirm.length ? ` y ${toConfirm.length} ${toConfirm.length === 1 ? "pedido" : "pedidos"} por confirmar` : ""}.`}
        actions={
          <Button size="lg" className="h-11 px-4" asChild>
            <Link href="/ordenes/nueva">
              <Plus /> Nueva orden
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entregas hoy" value={String(todays.length)} hint={`${tomorrows.length} mañana`} />
        <Stat label="Por confirmar" value={String(toConfirm.length)} hint="pedidos nuevos" highlight={toConfirm.length > 0} />
        <Stat label="Por cobrar" value={formatMoney(owed)} hint={`${receivables.length} ${receivables.length === 1 ? "factura" : "facturas"}`} />
        <Stat label="Ventas (14 días)" value={formatMoney(salesTotal)} hint="facturado" />
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
              {late.length > 0 && <DayGroup label="Atrasadas" orders={late} danger />}
              <DayGroup label="Hoy" orders={todays} />
              <DayGroup label="Mañana" orders={tomorrows} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ventas de los últimos 14 días</CardTitle>
              <CardDescription>Total facturado por día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-1.5">
                {sales.map((d, i) => (
                  <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-md ring-1 ring-foreground/10 transition-opacity group-hover:opacity-100">
                      {formatShortDate(d.date)}: {formatMoney(d.total)}
                    </span>
                    <div
                      className={`rounded-t-[4px] ${i === sales.length - 1 ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"}`}
                      style={{ height: `${Math.max((d.total / maxSale) * 100, 2)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{formatShortDate(sales[0].date)}</span>
                <span>Hoy</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {toConfirm.length > 0 && (
            <Card className="ring-amber-300/60 dark:ring-amber-800/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Inbox className="size-5 text-amber-600" /> Pedidos por confirmar
                </CardTitle>
                <CardDescription>Revísalos y confírmalos o recházalos</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {toConfirm.map((o) => (
                  <Link key={o.id} href={`/ordenes/${o.id}`} className="rounded-lg border p-3 transition-colors hover:bg-muted/60">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{o.customer.name}</span>
                      <span className="tabular-nums">{formatMoney(o.total)}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {o.number} · entrega {formatShortDate(o.delivery_at)} · {o.items.map((i) => i.description).join(", ")}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {low.length > 0 ? <TriangleAlert className="size-5 text-destructive" /> : <CircleCheck className="size-5 text-emerald-600" />} Insumos
              </CardTitle>
              <CardDescription>{low.length > 0 ? `${low.length} por debajo del mínimo` : "Todo sobre el mínimo"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {low.map((s) => (
                <div key={s.supply_id}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{s.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatQty(s.stock_on_hand, s.unit)} / {formatQty(s.min_stock, s.unit)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-destructive/70" style={{ width: `${s.min_stock > 0 ? (s.stock_on_hand / s.min_stock) * 100 : 0}%` }} />
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

function DayGroup({ label, orders, danger }: { label: string; orders: Order[]; danger?: boolean }) {
  return (
    <>
      <div className={`px-3 pt-2 text-xs font-semibold tracking-wide uppercase ${danger ? "text-destructive" : "text-muted-foreground"}`}>{label}</div>
      {orders.map((o) => (
        <OrderRow key={o.id} order={o} />
      ))}
      {orders.length === 0 && <p className="px-3 pb-2 text-sm text-muted-foreground">Sin entregas.</p>}
    </>
  )
}
