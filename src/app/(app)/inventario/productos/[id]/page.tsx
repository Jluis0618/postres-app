import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { categories, getRecipe, products, supplies } from "@/lib/demo-data"
import { ProductForm } from "./product-form"

// /inventario/productos/nuevo crea uno; /inventario/productos/<id> edita.
export default async function ProductPage({ params }: PageProps<"/inventario/productos/[id]">) {
  const { id } = await params
  const product = id === "nuevo" ? undefined : products.find((p) => p.id === id)
  if (id !== "nuevo" && !product) notFound()
  const recipe = product ? getRecipe(product.id) : undefined

  return (
    <>
      <Link href="/inventario?tab=productos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Productos
      </Link>
      <PageHeader title={product ? product.name : "Nuevo producto"} />
      <ProductForm
        categories={categories}
        supplies={supplies.map((s) => ({ id: s.id, name: s.name, unit: s.unit, unit_cost: s.unit_cost }))}
        initial={
          product && {
            name: product.name,
            category_id: product.category_id,
            price: product.price,
            unit: product.unit,
            emoji: product.emoji,
            track_stock: product.track_stock,
            recipe_yield: recipe?.recipe_yield ?? 1,
            lines: recipe?.items ?? [],
          }
        }
      />
    </>
  )
}
