import Link from "next/link"
import { ChefHat, ChevronRight, MessageCircle, Plus, ShoppingCart } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { SegmentedLinks } from "@/components/segmented-links"
import { StatusBadge } from "@/components/status-badge"
import { requireStaff } from "@/lib/auth"
import { getShoppingList, listCategories, listProducts, listRecipeItems, listSupplies, type ProductWithCost } from "@/lib/data"
import { formatMoney, formatQty, formatUnitCost } from "@/lib/format"
import type { Supply } from "@/lib/types"
import { PurchaseDialog, SupplyDetailSheet, SupplyFormDialog } from "./supply-dialogs"
import { ProductionDialog } from "./production-dialog"

export const metadata = { title: "Inventario" }

const tabs = [
  { key: "insumos", label: "Insumos" },
  { key: "productos", label: "Productos" },
  { key: "compras", label: "Lista de compras" },
] as const

type Tab = (typeof tabs)[number]["key"]

export default async function InventoryPage({ searchParams }: PageProps<"/inventario">) {
  await requireStaff()
  const { tab: requested } = await searchParams
  const tab: Tab = tabs.some((t) => t.key === requested) ? (requested as Tab) : "insumos"

  const [supplies, products, shopping] = await Promise.all([listSupplies(), listProducts(), getShoppingList(7)])
  const low = supplies.filter((s) => s.is_active && s.stock_on_hand < s.min_stock).length

  return (
    <>
      <PageHeader
        title="Inventario"
        description={`${supplies.length} insumos · ${products.length} productos · ${low} ${low === 1 ? "insumo bajo" : "insumos bajos"}`}
        actions={
          <>
            <PurchaseDialog supplies={supplies}>
              <Button variant="outline" size="lg" className="h-11 px-4">
                <ShoppingCart /> Registrar compra
              </Button>
            </PurchaseDialog>
            {tab === "productos" ? (
              <Button size="lg" className="h-11 px-4" asChild>
                <Link href="/inventario/productos/nuevo">
                  <Plus /> Nuevo producto
                </Link>
              </Button>
            ) : (
              <SupplyFormDialog>
                <Button size="lg" className="h-11 px-4">
                  <Plus /> Nuevo insumo
                </Button>
              </SupplyFormDialog>
            )}
          </>
        }
      />
      <SegmentedLinks
        basePath="/inventario"
        param="tab"
        current={tab}
        options={tabs.map((t) => ({ ...t, count: t.key === "compras" ? shopping.length : undefined }))}
      />
      {tab === "insumos" && <SuppliesTab supplies={supplies} />}
      {tab === "productos" && <ProductsTab products={products} supplies={supplies} />}
      {tab === "compras" && <ShoppingTab list={shopping} />}
    </>
  )
}

function SuppliesTab({ supplies }: { supplies: Supply[] }) {
  if (supplies.length === 0) {
    return (
      <EmptyState
        emoji="🧺"
        title="Todavía no hay insumos"
        description="Agrega la harina, el azúcar, los huevos y los empaques que usas. Así el sistema sabe cuándo te toca comprar."
        action={
          <SupplyFormDialog>
            <Button size="lg" className="h-11">
              <Plus /> Agregar el primero
            </Button>
          </SupplyFormDialog>
        }
      />
    )
  }
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Insumo</TableHead>
            <TableHead className="w-56">Stock</TableHead>
            <TableHead>Mínimo</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead className="hidden lg:table-cell">Proveedor</TableHead>
            <TableHead className="text-right">Estado</TableHead>
            <TableHead className="w-10 pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {supplies.map((s) => {
            const low = s.stock_on_hand < s.min_stock
            const pct = s.min_stock > 0 ? Math.min((s.stock_on_hand / (s.min_stock * 2)) * 100, 100) : s.stock_on_hand > 0 ? 100 : 0
            return (
              <TableRow key={s.id} className={cn("h-14", !s.is_active && "opacity-50")}>
                <TableCell className="pl-4 font-medium">
                  <SupplyDetailSheet supply={s} supplies={supplies}>
                    <button type="button" className="text-left hover:text-primary hover:underline">
                      {s.name}
                    </button>
                  </SupplyDetailSheet>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="w-16 tabular-nums">{formatQty(s.stock_on_hand, s.unit)}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", low ? "bg-destructive/70" : "bg-emerald-500/70")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{formatQty(s.min_stock, s.unit)}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{formatUnitCost(s.unit_cost, s.unit)}</TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{s.supplier}</TableCell>
                <TableCell className="text-right">
                  {!s.is_active ? (
                    <StatusBadge label="Inactivo" tone="neutral" />
                  ) : low ? (
                    <StatusBadge label="Bajo" tone="danger" />
                  ) : (
                    <StatusBadge label="OK" tone="success" />
                  )}
                </TableCell>
                <TableCell className="pr-4">
                  <SupplyDetailSheet supply={s} supplies={supplies}>
                    <Button variant="ghost" size="icon" aria-label={`Ver ${s.name}`}>
                      <ChevronRight />
                    </Button>
                  </SupplyDetailSheet>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

async function ProductsTab({ products, supplies }: { products: ProductWithCost[]; supplies: Supply[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        emoji="🎂"
        title="Todavía no hay productos"
        description="Agrega lo que vendes con su precio y su receta. Con la receta el sistema calcula el costo y descuenta los insumos."
        action={
          <Button size="lg" className="h-11" asChild>
            <Link href="/inventario/productos/nuevo">
              <Plus /> Crear el primero
            </Link>
          </Button>
        }
      />
    )
  }

  const [categories, recipeItems] = await Promise.all([listCategories(), listRecipeItems()])
  const supplyById = new Map(supplies.map((s) => [s.id, s]))
  const groups = [
    ...categories.map((c) => ({ id: c.id, name: c.name, items: products.filter((p) => p.category_id === c.id) })),
    { id: "none", name: "Sin categoría", items: products.filter((p) => !p.category_id) },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.id}>
          <h2 className="mb-3 font-heading text-lg font-semibold">{g.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => {
              const recipe = recipeItems.filter((r) => r.product_id === p.id)
              const hasRecipe = recipe.length > 0
              const margin = p.price - p.unit_cost
              const marginPct = p.price > 0 ? Math.round((margin / p.price) * 100) : 0
              return (
                <Card key={p.id} size="sm" className={cn(!p.is_active && "opacity-60")}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl">{p.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/inventario/productos/${p.id}`} className="font-medium hover:text-primary hover:underline">
                          {p.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">por {p.unit}</div>
                      </div>
                      <div className="text-right font-heading text-lg font-semibold tabular-nums">{formatMoney(p.price)}</div>
                    </div>
                    {hasRecipe ? (
                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-2 text-center text-xs">
                        <div>
                          <div className="text-muted-foreground">Costo</div>
                          <div className="font-medium tabular-nums">{formatMoney(p.unit_cost)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Ganancia</div>
                          <div className="font-medium tabular-nums">{formatMoney(margin)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Margen</div>
                          <div
                            className={cn(
                              "font-medium tabular-nums",
                              marginPct < 50 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {marginPct}%
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        Sin receta: no descuenta insumos ni calcula el costo.
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {!p.is_active ? (
                        <StatusBadge label="Inactivo" tone="neutral" />
                      ) : p.track_stock ? (
                        <StatusBadge label={`${p.stock_available} hechos`} tone={p.stock_available > 0 ? "success" : "neutral"} />
                      ) : (
                        <StatusBadge label="Bajo pedido" tone="neutral" />
                      )}
                      {p.track_stock && p.is_active ? (
                        <ProductionDialog
                          product={p}
                          lines={recipe.map((r) => {
                            const supply = supplyById.get(r.supply_id)!
                            return { name: supply.name, unit: supply.unit, perUnit: r.quantity / p.recipe_yield, available: supply.stock_on_hand }
                          })}
                        >
                          <Button variant="ghost" size="sm">
                            <ChefHat /> Registrar producción
                          </Button>
                        </ProductionDialog>
                      ) : (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/inventario/productos/${p.id}`}>{hasRecipe ? "Ver receta" : "Agregar receta"}</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function ShoppingTab({ list }: { list: Awaited<ReturnType<typeof getShoppingList>> }) {
  if (list.length === 0) {
    return (
      <EmptyState
        emoji="✅"
        title="No necesitas comprar nada"
        description="Tienes suficiente para las órdenes de los próximos 7 días y todos los insumos están sobre su mínimo."
      />
    )
  }
  const bySupplier = new Map<string, typeof list>()
  for (const s of list) {
    const key = s.supplier ?? "Sin proveedor"
    bySupplier.set(key, [...(bySupplier.get(key) ?? []), s])
  }
  const message = "🛒 Lista de compras\n" + list.map((s) => `• ${s.name}: ${formatQty(s.to_buy, s.unit)}`).join("\n")

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">Lo que necesitan las órdenes de los próximos 7 días, más el mínimo, menos lo que ya tienes.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...bySupplier.entries()].map(([supplier, items]) => (
          <Card key={supplier}>
            <CardHeader>
              <CardTitle className="text-lg">{supplier}</CardTitle>
              <CardDescription>
                {items.length} {items.length === 1 ? "insumo" : "insumos"} · ≈ {formatMoney(items.reduce((s, i) => s + i.to_buy * i.unit_cost, 0))}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {items.map((s) => (
                <label key={s.supply_id} className="flex cursor-pointer items-center gap-3 py-3">
                  <input type="checkbox" className="size-5 accent-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Órdenes: {formatQty(s.required, s.unit)} · Hay: {formatQty(s.stock_on_hand, s.unit)} · Mínimo: {formatQty(s.min_stock, s.unit)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-lg font-semibold tabular-nums">{formatQty(s.to_buy, s.unit)}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">≈ {formatMoney(s.to_buy * s.unit_cost)}</div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" size="lg" className="h-11 w-fit px-4" asChild>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <MessageCircle /> Enviar lista por WhatsApp
        </a>
      </Button>
    </div>
  )
}
