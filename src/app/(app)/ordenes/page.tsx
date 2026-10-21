import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OrderRow } from "@/components/order-row"
import { PageHeader } from "@/components/page-header"
import { SegmentedLinks } from "@/components/segmented-links"
import { getCustomer, orders, orderTotals, type Order } from "@/lib/demo-data"
import { daysFromToday, formatDay, formatMoney, formatTime, orderStatus, toneClasses } from "@/lib/format"

const views = [
  { key: "proximas", label: "Próximas" },
  { key: "calendario", label: "Calendario" },
  { key: "confirmar", label: "Por confirmar" },
  { key: "anteriores", label: "Anteriores" },
] as const

type View = (typeof views)[number]["key"]

function filterOrders(view: View) {
  if (view === "confirmar") return orders.filter((o) => o.status === "pending_confirmation")
  if (view === "anteriores")
    return orders.filter((o) => daysFromToday(o.delivery_at) < 0 || ["delivered", "cancelled"].includes(o.status))
  if (view === "calendario") return orders.filter((o) => o.status !== "cancelled")
  return orders.filter((o) => daysFromToday(o.delivery_at) >= 0 && !["delivered", "cancelled"].includes(o.status))
}

export default async function OrdersPage({ searchParams }: PageProps<"/ordenes">) {
  const { vista, semana } = await searchParams
  const view: View = views.some((v) => v.key === vista) ? (vista as View) : "proximas"

  return (
    <>
      <PageHeader
        title="Órdenes"
        description="Organizadas por fecha de entrega"
        actions={
          <Button size="lg" className="h-11 px-4" asChild>
            <Link href="/ordenes/nueva">
              <Plus /> Nueva orden
            </Link>
          </Button>
        }
      />

      <SegmentedLinks
        basePath="/ordenes"
        param="vista"
        current={view}
        options={views.map((v) => ({ ...v, count: v.key === "calendario" ? undefined : filterOrders(v.key).length }))}
      />

      {view === "calendario" ? <WeekCalendar weekOffset={Number(semana) || 0} /> : <OrderList view={view} />}
    </>
  )
}

function OrderList({ view }: { view: View }) {
  const list = filterOrders(view).sort((a, b) =>
    view === "anteriores" ? b.delivery_at.localeCompare(a.delivery_at) : a.delivery_at.localeCompare(b.delivery_at)
  )
  const groups = new Map<number, Order[]>()
  for (const o of list) {
    const key = daysFromToday(o.delivery_at)
    groups.set(key, [...(groups.get(key) ?? []), o])
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([day, dayOrders]) => (
        <section key={day}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="font-heading text-lg font-semibold">{formatDay(dayOrders[0].delivery_at)}</h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {dayOrders.length} {dayOrders.length === 1 ? "orden" : "órdenes"} ·{" "}
              {formatMoney(dayOrders.reduce((sum, o) => sum + orderTotals(o).total, 0))}
            </span>
          </div>
          <Card className="py-1">
            <CardContent className="flex flex-col px-1">
              {dayOrders.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </CardContent>
          </Card>
        </section>
      ))}
      {groups.size === 0 && <p className="py-12 text-center text-muted-foreground">No hay órdenes aquí.</p>}
    </div>
  )
}

// Semana de lunes a domingo. weekOffset = 0 es la semana actual.
function WeekCalendar({ weekOffset }: { weekOffset: number }) {
  const today = new Date()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
  const list = filterOrders("calendario")
  const range = `${days[0].toLocaleDateString("es-DO", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("es-DO", { day: "numeric", month: "short" })}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-10" asChild>
          <Link href={`/ordenes?vista=calendario&semana=${weekOffset - 1}`} aria-label="Semana anterior">
            <ChevronLeft />
          </Link>
        </Button>
        <Button variant="outline" size="icon" className="size-10" asChild>
          <Link href={`/ordenes?vista=calendario&semana=${weekOffset + 1}`} aria-label="Semana siguiente">
            <ChevronRight />
          </Link>
        </Button>
        <h2 className="ml-1 font-heading text-lg font-semibold">{range}</h2>
        {weekOffset !== 0 && (
          <Button variant="ghost" className="ml-auto h-10" asChild>
            <Link href="/ordenes?vista=calendario">Hoy</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {days.map((d) => {
          const offset = daysFromToday(d.toISOString())
          const dayOrders = list
            .filter((o) => daysFromToday(o.delivery_at) === offset)
            .sort((a, b) => a.delivery_at.localeCompare(b.delivery_at))
          const isToday = offset === 0
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "flex min-h-28 flex-col gap-1.5 rounded-xl border bg-card p-2 md:min-h-64",
                isToday && "border-primary/60 ring-2 ring-primary/15"
              )}
            >
              <div className="flex items-baseline justify-between px-1 md:flex-col md:items-start">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {d.toLocaleDateString("es-DO", { weekday: "short" })}
                </span>
                <span className={cn("font-heading text-xl font-semibold", isToday && "text-primary")}>{d.getDate()}</span>
              </div>
              {dayOrders.map((o) => {
                const status = orderStatus[o.status]
                return (
                  <Link
                    key={o.id}
                    href={`/ordenes/${o.id}`}
                    className={cn("rounded-lg px-2 py-1.5 text-xs transition-opacity hover:opacity-80", toneClasses[status.tone])}
                  >
                    <div className="font-semibold">{formatTime(o.delivery_at)}</div>
                    <div className="truncate">{getCustomer(o.customer_id).name}</div>
                    <div className="truncate opacity-80">{o.items[0].description}</div>
                  </Link>
                )
              })}
              {dayOrders.length === 0 && <span className="px-1 text-xs text-muted-foreground/60 md:mt-2">Libre</span>}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(["pending_confirmation", "pending", "in_preparation", "ready", "delivered"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", toneClasses[orderStatus[s].tone])} />
            {orderStatus[s].label}
          </span>
        ))}
      </div>
    </div>
  )
}
