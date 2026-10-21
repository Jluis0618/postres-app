import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { requireStaff } from "@/lib/auth"
import { getSettings, listCustomers, listProducts } from "@/lib/data"
import { OrderForm } from "./order-form"

export const metadata = { title: "Nueva orden" }

export default async function NewOrderPage({ searchParams }: PageProps<"/ordenes/nueva">) {
  await requireStaff()
  const { cliente } = await searchParams
  const [products, customers, settings] = await Promise.all([listProducts(), listCustomers(), getSettings()])

  return (
    <>
      <Link href="/ordenes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Órdenes
      </Link>
      <PageHeader title="Nueva orden" />
      <OrderForm
        products={products
          .filter((p) => p.is_active)
          .map((p) => ({ id: p.id, name: p.name, price: Number(p.price), unit: p.unit, emoji: p.emoji, stock: p.track_stock ? Number(p.stock_available) : null }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        defaultCustomerId={typeof cliente === "string" ? cliente : undefined}
        taxRate={settings.itbis_enabled ? Number(settings.itbis_rate) : 0}
      />
    </>
  )
}
