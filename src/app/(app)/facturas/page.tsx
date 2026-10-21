import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { getCustomer, invoices } from "@/lib/demo-data"
import { formatMoney, formatShortDate, paymentStatus } from "@/lib/format"

export default function InvoicesPage() {
  const billed = invoices.reduce((sum, i) => sum + i.total, 0)
  const collected = invoices.reduce((sum, i) => sum + i.paid, 0)

  return (
    <>
      <PageHeader title="Facturas" description="Cada orden lista o entregada se convierte en factura" />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Summary label="Facturado" value={formatMoney(billed)} />
        <Summary label="Cobrado" value={formatMoney(collected)} />
        <Summary label="Por cobrar" value={formatMoney(billed - collected)} highlight />
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
              <TableRow key={inv.id} className="h-14">
                <TableCell className="pl-4 font-medium">
                  <Link href={`/facturas/${inv.id}`} className="hover:text-primary hover:underline">
                    {inv.number}
                  </Link>
                </TableCell>
                <TableCell>{getCustomer(inv.customer_id).name}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{formatShortDate(inv.issued_on)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(inv.total)}</TableCell>
                <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                  {formatMoney(inv.total - inv.paid)}
                </TableCell>
                <TableCell>
                  <StatusBadge {...paymentStatus[inv.payment_status]} />
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
      <p className="mt-4 text-sm text-muted-foreground">
        Para facturar, abre una orden lista o entregada en{" "}
        <Link href="/ordenes" className="text-primary underline-offset-4 hover:underline">
          Órdenes
        </Link>
        .
      </p>
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
