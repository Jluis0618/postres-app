import Link from "next/link"
import { ChevronRight, Link2, Store, Truck } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { getCustomer, orderTotals, type Order } from "@/lib/demo-data"
import { formatMoney, formatTime, orderStatus } from "@/lib/format"

export function OrderRow({ order }: { order: Order }) {
  const customer = getCustomer(order.customer_id)
  const { total } = orderTotals(order)
  const status = orderStatus[order.status]
  const summary = order.items.map((i) => `${i.quantity} × ${i.description}`).join(", ")

  return (
    <Link
      href={`/ordenes/${order.id}`}
      className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-muted/70"
    >
      <div className="w-[4.5rem] shrink-0 text-center">
        <div className="text-base font-semibold whitespace-nowrap tabular-nums">{formatTime(order.delivery_at)}</div>
        <div className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          {order.delivery_type === "delivery" ? <Truck className="size-3.5" /> : <Store className="size-3.5" />}
          {order.delivery_type === "delivery" ? "Envío" : "Retiro"}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{customer.name}</span>
          {order.source === "commissions" && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Sistema de comisiones">
              <Link2 className="size-3.5" />
              <span className="hidden sm:inline">Sistema de comisiones</span>
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{summary}</p>
      </div>
      <div className="hidden text-right sm:block">
        <div className="font-medium tabular-nums">{formatMoney(total)}</div>
        <div className="text-xs text-muted-foreground">{order.number}</div>
      </div>
      <StatusBadge {...status} />
      <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
    </Link>
  )
}
