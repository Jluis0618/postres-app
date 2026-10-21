import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { customers, products } from "@/lib/demo-data"
import { OrderForm } from "./order-form"

export default function NewOrderPage() {
  return (
    <>
      <Link href="/ordenes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Órdenes
      </Link>
      <PageHeader title="Nueva orden" />
      <OrderForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          emoji: p.emoji,
          stock: p.track_stock ? p.stock_available : null,
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      />
    </>
  )
}
