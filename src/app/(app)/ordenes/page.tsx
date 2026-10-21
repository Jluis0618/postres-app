import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { OrderRow } from "@/components/order-row"
import { PageHeader } from "@/components/page-header"
import { SegmentedLinks } from "@/components/segmented-links"
import { requireStaff } from "@/lib/auth"
import { listOrders } from "@/lib/data"
import { addDays, dayKey, formatDay, formatMoney, formatShortDate, formatTime, orderStatus, toneClasses } from "@/lib/format"
import type { Order } from "@/lib/types"

export const metadata = { title: "Órdenes" }

const views = [
  { key: "proximas", label: "Próximas" },
  { key: "calendario", label: "Calendario" },
  { key: "confirmar", label: "Por confirmar" },
  { key: "anteriores", label: "Anteriores" },
] as const

type View = (typeof views)[number]["key"]

export default async function OrdersPage({ searchParams }: PageProps<"/ordenes">) {
  await requireStaff()
  const { vista, semana } = await searchParams
  const view: View = views.some((v) => v.key === vista) ? (vista as View) : "proximas"
  const today = dayKey(new Date())

  // Lo pendiente de entregar, aunque la fecha ya haya pasado (así no se olvida nada).
  const [open, toConfirm] = await Promise.all([
    listOrders({ excludeStatuses: ["delivered", "cancelled"] }),
    listOrders({ statuses: ["pending_confirmation"] }),
  ])

  let content: React.ReactNode
  if (view === "calendario") {
    content = <WeekCalendar weekOffset={Number(semana) || 0} />
  } else if (view === "anteriores") {
    const past = await listOrders({ statuses: ["delivered", "cancelled"], ascending: false, limit: 100 })
    content = <OrderList orders={past} empty="Aquí aparecen las órdenes entregadas y canceladas." />
  } else {
    content = (
      <OrderList
        orders={view === "confirmar" ? toConfirm : open}
        empty={view === "confirmar" ? "No hay pedidos esperando confirmación." : "No hay órdenes pendientes. ¡Crea la primera!"}
        today={today}
      />
    )
  }

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
        options={views.map((v) => ({
          ...v,
          count: v.key === "proximas" ? open.length : v.key === "confirmar" ? toConfirm.length : undefined,
        }))}
      />
      {content}
    </>
  )
}

function OrderList({ orders, empty, today }: { orders: Order[]; empty: string; today?: string }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        emoji="📋"
        title="Nada por aquí"
        description={empty}
        action={
          <Button size="lg" className="h-11" asChild>
            <Link href="/ordenes/nueva">
              <Plus /> Nueva orden
            </Link>
          </Button>
        }
      />
    )
  }
  const groups = new Map<string, Order[]>()
  for (const o of orders) {
    const key = dayKey(o.delivery_at)
    groups.set(key, [...(groups.get(key) ?? []), o])
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([day, dayOrders]) => {
        const late = today && day < today
        return (
          <section key={day}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className={cn("font-heading text-lg font-semibold", late && "text-destructive")}>
                {formatDay(dayOrders[0].delivery_at)}
                {late && <span className="ml-2 text-sm font-normal">· atrasada</span>}
              </h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {dayOrders.length} {dayOrders.length === 1 ? "orden" : "órdenes"} · {formatMoney(dayOrders.reduce((sum, o) => sum + Number(o.total), 0))}
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
        )
      })}
    </div>
  )
}

// Semana de lunes a domingo (hora de RD). weekOffset = 0 es la semana actual.
async function WeekCalendar({ weekOffset }: { weekOffset: number }) {
  const today = dayKey(new Date())
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  const monday = addDays(today, -weekday + weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const list = await listOrders({ excludeStatuses: ["cancelled"], fromDay: days[0], toDay: days[6] })

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
        <h2 className="ml-1 font-heading text-lg font-semibold">
          {formatShortDate(days[0])} – {formatShortDate(days[6])}
        </h2>
        {weekOffset !== 0 && (
          <Button variant="ghost" className="ml-auto h-10" asChild>
            <Link href="/ordenes?vista=calendario">Hoy</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {days.map((d) => {
          const dayOrders = list.filter((o) => dayKey(o.delivery_at) === d)
          const isToday = d === today
          const date = new Date(`${d}T12:00:00Z`)
          return (
            <div key={d} className={cn("flex min-h-28 flex-col gap-1.5 rounded-xl border bg-card p-2 md:min-h-64", isToday && "border-primary/60 ring-2 ring-primary/15")}>
              <div className="flex items-baseline justify-between px-1 md:flex-col md:items-start">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {date.toLocaleDateString("es-DO", { weekday: "short", timeZone: "UTC" })}
                </span>
                <span className={cn("font-heading text-xl font-semibold", isToday && "text-primary")}>{date.getUTCDate()}</span>
              </div>
              {dayOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/ordenes/${o.id}`}
                  className={cn("rounded-lg px-2 py-1.5 text-xs transition-opacity hover:opacity-80", toneClasses[orderStatus[o.status].tone])}
                >
                  <div className="font-semibold">{formatTime(o.delivery_at)}</div>
                  <div className="truncate">{o.customer.name}</div>
                  <div className="truncate opacity-80">{o.items[0]?.description}</div>
                </Link>
              ))}
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
