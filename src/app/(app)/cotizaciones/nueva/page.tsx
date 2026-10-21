import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { requireStaff } from "@/lib/auth"
import { getSettings, listCustomers, listProducts } from "@/lib/data"
import { OrderForm } from "../../ordenes/nueva/order-form"

export const metadata = { title: "Nueva cotización" }

export default async function NewQuotePage() {
  await requireStaff()
  const [products, customers, settings] = await Promise.all([listProducts(), listCustomers(), getSettings()])

  return (
    <>
      <Link href="/cotizaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Cotizaciones
      </Link>
      <PageHeader title="Nueva cotización" />
      <OrderForm
        mode="quote"
        products={products
          .filter((p) => p.is_active)
          .map((p) => ({ id: p.id, name: p.name, price: Number(p.price), unit: p.unit, emoji: p.emoji, stock: null }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        validityDays={settings.quote_validity_days}
        taxRate={settings.itbis_enabled ? Number(settings.itbis_rate) : 0}
      />
    </>
  )
}
