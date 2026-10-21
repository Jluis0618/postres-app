import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { requireStaff } from "@/lib/auth"
import { getProduct, listCategories, listSupplies } from "@/lib/data"
import { ProductForm } from "./product-form"

// /inventario/productos/nuevo crea uno; /inventario/productos/<id> edita.
export default async function ProductPage({ params }: PageProps<"/inventario/productos/[id]">) {
  await requireStaff()
  const { id } = await params
  const isNew = id === "nuevo"
  const [found, categories, supplies] = await Promise.all([isNew ? null : getProduct(id), listCategories(), listSupplies()])
  if (!isNew && !found) notFound()

  return (
    <>
      <Link href="/inventario?tab=productos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Productos
      </Link>
      <PageHeader title={found ? found.product.name : "Nuevo producto"} />
      <ProductForm
        categories={categories}
        supplies={supplies.filter((s) => s.is_active || found?.recipe.some((r) => r.supply_id === s.id))}
        initial={found ? { ...found.product, recipe: found.recipe } : undefined}
      />
    </>
  )
}
