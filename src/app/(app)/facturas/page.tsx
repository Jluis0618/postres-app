import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { requireStaff } from "@/lib/auth"
import { listInvoices } from "@/lib/data"
import { formatMoney, formatShortDate, paymentStatus } from "@/lib/format"

export const metadata = { title: "Facturas" }

export default async function InvoicesPage() {
  await requireStaff()
  const invoices = await listInvoices()
  const issued = invoices.filter((i) => i.status === "issued")
  const billed = issued.reduce((sum, i) => sum + Number(i.total), 0)
  const owed = issued.reduce((sum, i) => sum + i.balance, 0)

  return (
    <>
      <PageHeader title="Facturas" description="Cada orden lista o entregada se convierte en factura" />

      {invoices.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="Todavía no hay facturas"
          description="Abre una orden que esté lista o entregada y toca “Crear factura”."
          action={
            <Button size="lg" className="h-11" asChild>
              <Link href="/ordenes">Ir a Órdenes</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Summary label="Facturado" value={formatMoney(billed)} />
            <Summary label="Cobrado" value={formatMoney(billed - owed)} />
            <Summary label="Por cobrar" value={formatMoney(owed)} highlight={owed > 0} />
          </div>

          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className={cn("h-14", inv.status === "void" && "opacity-50")}>
                    <TableCell className="pl-4 font-medium">
                      <Link href={`/facturas/${inv.id}`} className="hover:text-primary hover:underline">
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.customer.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatShortDate(inv.issued_on)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", inv.status === "void" && "line-through")}>{formatMoney(inv.total)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">{formatMoney(inv.balance)}</TableCell>
                    <TableCell>
                      {inv.status === "void" ? <StatusBadge label="Anulada" tone="neutral" /> : <StatusBadge {...paymentStatus[inv.payment_status]} />}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="icon" aria-label={`Ver ${inv.number}`} asChild>
                        <Link href={`/facturas/${inv.id}`}>
                          <ChevronRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  )
}

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card size="sm" className={highlight ? "bg-rose-50 dark:bg-rose-950/30" : undefined}>
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 font-heading text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      </CardContent>
    </Card>
  )
}
