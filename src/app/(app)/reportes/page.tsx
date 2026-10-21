import Link from "next/link"
import { cn } from "cn"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { SegmentedLinks } from "@/components/segmented-links"
import { StatusBadge } from "@/components/status-badge"
import { customers, getCustomer, getProduct, invoices, orders, orderTotals, products, salesByMonth, topProducts } from "@/lib/demo-data"
import { formatMoney, formatShortDate, paymentStatus } from "@/lib/format"

const ranges = [
  { key: "mes", label: "Este mes" },
  { key: "3m", label: "3 meses" },
  { key: "6m", label: "6 meses" },
] as const

export default async function ReportsPage({ searchParams }: PageProps<"/reportes">) {
  const { rango } = await searchParams
  const range = ranges.some((r) => r.key === rango) ? (rango as string) : "6m"

  const current = salesByMonth.at(-1)!
  const previous = salesByMonth.at(-2)!
  const change = Math.round(((current.total - previous.total) / previous.total) * 100)
  const monthOrders = orders.filter((o) => o.status !== "cancelled").length
  const avgTicket = Math.round(current.total / Math.max(invoices.length, 1))
  const months = range === "mes" ? salesByMonth.slice(-1) : range === "3m" ? salesByMonth.slice(-3) : salesByMonth
  const maxMonth = Math.max(...months.map((m) => m.total))
  const gridSteps = [0.25, 0.5, 0.75, 1]
  const maxProduct = Math.max(...topProducts.map((p) => p.total))
  const avgMargin = Math.round(
    (products.reduce((sum, p) => sum + (p.price - p.unit_cost) / p.price, 0) / products.length) * 100
  )

  const byCustomer = customers
    .map((c) => ({
      customer: c,
      total: orders.filter((o) => o.customer_id === c.id && o.status !== "cancelled").reduce((s, o) => s + orderTotals(o).total, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
  const receivable = invoices.filter((i) => i.payment_status !== "paid")

  return (
    <>
      <PageHeader title="Reportes" description="Cuánto vendes, qué se vende más y quién te debe" />
      <SegmentedLinks basePath="/reportes" param="rango" current={range} options={[...ranges]} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ventas del mes" value={formatMoney(current.total)} hint={`${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs. ${previous.month.toLowerCase()}`} good={change >= 0} />
        <Kpi label="Órdenes" value={String(monthOrders)} hint="este mes" />
        <Kpi label="Venta promedio" value={formatMoney(avgTicket)} hint="por factura" />
        <Kpi label="Margen promedio" value={`${avgMargin}%`} hint="según las recetas" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por mes</CardTitle>
            <CardDescription>Total facturado (RD$)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-56">
              {gridSteps.map((g) => (
                <div key={g} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${g * 100}%` }}>
                  <span className="absolute -top-2.5 left-0 bg-card pr-1 text-[10px] text-muted-foreground tabular-nums">
                    {Math.round((maxMonth * g) / 1000)}k
                  </span>
                </div>
              ))}
              <div className="absolute inset-0 flex items-end gap-3 border-b border-border pl-8">
                {months.map((m, i) => {
                  const last = i === months.length - 1
                  return (
                    <div key={m.month} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                      <span
                        className={cn(
                          "pointer-events-none absolute z-10 rounded-md bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10 tabular-nums transition-opacity",
                          last ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        style={{ bottom: `calc(${(m.total / maxMonth) * 100}% + 6px)` }}
                      >
                        {formatMoney(m.total)}
                      </span>
                      <div
                        className={cn("w-full max-w-14 rounded-t-[4px] transition-colors", last ? "bg-primary" : "bg-primary/35 group-hover:bg-primary/60")}
                        style={{ height: `${(m.total / maxMonth) * 100}%` }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="mt-2 flex gap-3 pl-8">
              {months.map((m) => (
                <span key={m.month} className="flex-1 text-center text-xs text-muted-foreground">
                  {m.month}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lo más vendido</CardTitle>
            <CardDescription>Por ventas en RD$</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {topProducts.map((t) => {
              const p = getProduct(t.product_id)
              return (
                <div key={t.product_id} className="group" title={`${p.name}: ${t.units} vendidos, ${formatMoney(t.total)}`}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate">
                      {p.emoji} {p.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{formatMoney(t.total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70 transition-colors group-hover:bg-primary" style={{ width: `${(t.total / maxProduct) * 100}%` }} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t.units} vendidos</div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mejores clientes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {byCustomer.map(({ customer, total }, i) => (
              <Link key={customer.id} href={`/clientes/${customer.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary">
                <span className="w-5 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium">{customer.name}</span>
                <span className="text-sm tabular-nums">{formatMoney(total)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cuentas por cobrar</CardTitle>
            <CardDescription>
              {formatMoney(receivable.reduce((s, i) => s + i.total - i.paid, 0))} en {receivable.length} facturas
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {receivable.map((inv) => (
              <Link key={inv.id} href={`/facturas/${inv.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{getCustomer(inv.customer_id).name}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.number} · {formatShortDate(inv.issued_on)}
                  </div>
                </div>
                <StatusBadge {...paymentStatus[inv.payment_status]} />
                <span className="w-24 text-right text-sm font-medium tabular-nums">{formatMoney(inv.total - inv.paid)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Kpi({ label, value, hint, good }: { label: string; value: string; hint: string; good?: boolean }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{value}</div>
        <div className={cn("mt-1 text-xs", good === undefined ? "text-muted-foreground" : good ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
          {hint}
        </div>
      </CardContent>
    </Card>
  )
}
