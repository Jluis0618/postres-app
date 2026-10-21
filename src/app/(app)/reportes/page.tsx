import Link from "next/link"
import { cn } from "cn"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { SegmentedLinks } from "@/components/segmented-links"
import { StatusBadge } from "@/components/status-badge"
import { requireAdmin } from "@/lib/auth"
import { averageMargin, listCustomers, listReceivables, salesByMonth, topCustomers, topProducts } from "@/lib/data"
import { formatMoney, formatShortDate, paymentStatus } from "@/lib/format"

export const metadata = { title: "Reportes" }

const ranges = [
  { key: "mes", label: "Este mes", months: 1 },
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "12m", label: "12 meses", months: 12 },
] as const

export default async function ReportsPage({ searchParams }: PageProps<"/reportes">) {
  await requireAdmin()
  const { rango } = await searchParams
  const range = ranges.find((r) => r.key === rango) ?? ranges[2]

  // Siempre se piden al menos 2 meses para comparar con el mes anterior.
  const { months: allMonths } = await salesByMonth(Math.max(range.months, 2))
  const months = allMonths.slice(-range.months)
  const rangeFrom = `${months[0].key}-01`
  const [products, customersTop, receivables, margin, customers] = await Promise.all([
    topProducts(rangeFrom),
    topCustomers(rangeFrom),
    listReceivables(),
    averageMargin(),
    listCustomers(),
  ])

  const current = allMonths.at(-1)!
  const previous = allMonths.at(-2)!
  const change = previous.total > 0 ? Math.round(((current.total - previous.total) / previous.total) * 100) : null
  const rangeTotal = months.reduce((s, m) => s + m.total, 0)
  const maxMonth = Math.max(...months.map((m) => m.total), 1)
  const maxProduct = Math.max(...products.map((p) => p.total), 1)
  const nameById = new Map(customers.map((c) => [c.id, c.name]))
  const owed = receivables.reduce((s, r) => s + Number(r.balance), 0)

  return (
    <>
      <PageHeader title="Reportes" description="Cuánto vendes, qué se vende más y quién te debe" />
      <SegmentedLinks basePath="/reportes" param="rango" current={range.key} options={ranges.map(({ key, label }) => ({ key, label }))} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Ventas de este mes"
          value={formatMoney(current.total)}
          hint={change === null ? "sin mes anterior para comparar" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs. ${previous.label.toLowerCase()}`}
          good={change === null ? undefined : change >= 0}
        />
        <Kpi label={`Ventas (${range.label.toLowerCase()})`} value={formatMoney(rangeTotal)} hint="facturas vigentes" />
        <Kpi label="Por cobrar" value={formatMoney(owed)} hint={`${receivables.length} ${receivables.length === 1 ? "factura" : "facturas"}`} />
        <Kpi label="Margen promedio" value={margin === null ? "—" : `${margin}%`} hint="productos con receta" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por mes</CardTitle>
            <CardDescription>Total facturado (RD$)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-56">
              {[0.25, 0.5, 0.75, 1].map((g) => (
                <div key={g} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${g * 100}%` }}>
                  <span className="absolute -top-2.5 left-0 bg-card pr-1 text-[10px] text-muted-foreground tabular-nums">
                    {maxMonth * g >= 1000 ? `${Math.round((maxMonth * g) / 1000)}k` : Math.round(maxMonth * g)}
                  </span>
                </div>
              ))}
              <div className="absolute inset-0 flex items-end gap-3 border-b border-border pl-8">
                {months.map((m, i) => {
                  const last = i === months.length - 1
                  return (
                    <div key={m.key} className="group relative flex h-full flex-1 flex-col items-center justify-end">
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
                        style={{ height: `${Math.max((m.total / maxMonth) * 100, m.total > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="mt-2 flex gap-3 pl-8">
              {months.map((m) => (
                <span key={m.key} className="flex-1 text-center text-xs text-muted-foreground">
                  {m.label}
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
            {products.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay ventas en este periodo.</p>}
            {products.map((p) => (
              <div key={p.name} className="group" title={`${p.name}: ${p.units} vendidos, ${formatMoney(p.total)}`}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted-foreground tabular-nums">{formatMoney(p.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70 transition-colors group-hover:bg-primary" style={{ width: `${(p.total / maxProduct) * 100}%` }} />
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.units} vendidos</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mejores clientes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {customersTop.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay ventas en este periodo.</p>}
            {customersTop.map((c, i) => (
              <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary">
                <span className="w-5 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                <span className="text-sm tabular-nums">{formatMoney(c.total)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cuentas por cobrar</CardTitle>
            <CardDescription>
              {formatMoney(owed)} en {receivables.length} {receivables.length === 1 ? "factura" : "facturas"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {receivables.length === 0 && <p className="text-sm text-muted-foreground">Nadie te debe. 🎉</p>}
            {receivables.map((inv) => (
              <Link key={inv.invoice_id} href={`/facturas/${inv.invoice_id}`} className="flex items-center gap-3 py-2.5 hover:text-primary">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{nameById.get(inv.customer_id) ?? "Cliente"}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.number} · {formatShortDate(inv.issued_on)}
                  </div>
                </div>
                <StatusBadge {...paymentStatus[inv.payment_status]} />
                <span className="w-24 text-right text-sm font-medium tabular-nums">{formatMoney(inv.balance)}</span>
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
        <div className={cn("mt-1 text-xs", good === undefined ? "text-muted-foreground" : good ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>{hint}</div>
      </CardContent>
    </Card>
  )
}
