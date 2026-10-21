import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { customers, products } from "@/lib/demo-data"
import { OrderForm } from "../../ordenes/nueva/order-form"

export default function NewQuotePage() {
  return (
    <>
      <Link href="/cotizaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Cotizaciones
      </Link>
      <PageHeader title="Nueva cotización" />
      <OrderForm
        mode="quote"
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          emoji: p.emoji,
          stock: null,
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      />
    </>
  )
}
