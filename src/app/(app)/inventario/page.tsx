import Link from "next/link"
import { ChefHat, ChevronRight, MessageCircle, Plus, ShoppingCart } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { SegmentedLinks } from "@/components/segmented-links"
import { StatusBadge } from "@/components/status-badge"
import { categories, getRecipe, getSupply, lowStockSupplies, products, shoppingList, supplies, supplyMovements } from "@/lib/demo-data"
import { formatMoney, formatQty } from "@/lib/format"
import { PurchaseDialog, SupplyDetailSheet, SupplyFormDialog } from "./supply-dialogs"
import { ProductionDialog } from "./production-dialog"

const tabs = [
  { key: "insumos", label: "Insumos" },
  { key: "productos", label: "Productos" },
  { key: "compras", label: "Lista de compras" },
] as const

type Tab = (typeof tabs)[number]["key"]

export default async function InventoryPage({ searchParams }: PageProps<"/inventario">) {
  const { tab: requested } = await searchParams
  const tab: Tab = tabs.some((t) => t.key === requested) ? (requested as Tab) : "insumos"

  return (
    <>
      <PageHeader
        title="Inventario"
        description={`${supplies.length} insumos · ${products.length} productos · ${lowStockSupplies().length} insumos bajos`}
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
        options={tabs.map((t) => ({ ...t, count: t.key === "compras" ? shoppingList().length : undefined }))}
      />
      {tab === "insumos" && <SuppliesTab />}
      {tab === "productos" && <ProductsTab />}
      {tab === "compras" && <ShoppingTab />}
    </>
  )
}

function SuppliesTab() {
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
            const pct = Math.min((s.stock_on_hand / (s.min_stock * 2)) * 100, 100)
            return (
              <TableRow key={s.id} className="h-14">
                <TableCell className="pl-4 font-medium">
                  <SupplyDetailSheet supply={s} supplies={supplies} movements={supplyMovements(s.id)}>
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
                <TableCell className="text-muted-foreground tabular-nums">
                  {s.unit === "unit" ? `${formatMoney(s.unit_cost)} / u` : `${formatMoney(s.unit_cost * 1000)} / ${s.unit === "g" ? "kg" : "L"}`}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{s.supplier}</TableCell>
                <TableCell className="text-right">
                  {low ? <StatusBadge label="Bajo" tone="danger" /> : <StatusBadge label="OK" tone="success" />}
                </TableCell>
                <TableCell className="pr-4">
                  <SupplyDetailSheet supply={s} supplies={supplies} movements={supplyMovements(s.id)}>
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

function ProductsTab() {
  return (
    <div className="flex flex-col gap-6">
      {categories.map((c) => (
        <section key={c.id}>
          <h2 className="mb-3 font-heading text-lg font-semibold">{c.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter((p) => p.category_id === c.id)
              .map((p) => {
                const margin = p.price - p.unit_cost
                const marginPct = Math.round((margin / p.price) * 100)
                return (
                  <Card key={p.id} size="sm">
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
                          <div className={cn("font-medium tabular-nums", marginPct < 50 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                            {marginPct}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {p.track_stock ? (
                          <StatusBadge label={`${p.stock_available} hechos`} tone={p.stock_available > 0 ? "success" : "neutral"} />
                        ) : (
                          <StatusBadge label="Bajo pedido" tone="neutral" />
                        )}
                        {p.track_stock ? (
                          <ProductionDialog
                            product={p}
                            lines={(getRecipe(p.id)?.items ?? []).map((i) => {
                              const supply = getSupply(i.supply_id)
                              return {
                                name: supply.name,
                                unit: supply.unit,
                                perUnit: i.quantity / getRecipe(p.id)!.recipe_yield,
                                available: supply.stock_on_hand,
                              }
                            })}
                          >
                            <Button variant="ghost" size="sm">
                              <ChefHat /> Registrar producción
                            </Button>
                          </ProductionDialog>
                        ) : (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/inventario/productos/${p.id}`}>Ver receta</Link>
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

function ShoppingTab() {
  const list = shoppingList()
  const bySupplier = new Map<string, typeof list>()
  for (const s of list) bySupplier.set(s.supplier, [...(bySupplier.get(s.supplier) ?? []), s])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Lo que necesitan las órdenes de los próximos 7 días, más el mínimo, menos lo que ya tienes.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...bySupplier.entries()].map(([supplier, items]) => (
          <Card key={supplier}>
            <CardHeader>
              <CardTitle className="text-lg">{supplier}</CardTitle>
              <CardDescription>{items.length} insumos</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {items.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-3 py-3">
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
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            "🛒 Lista de compras\n" + list.map((s) => `• ${s.name}: ${formatQty(s.to_buy, s.unit)}`).join("\n")
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle /> Enviar lista por WhatsApp
        </a>
      </Button>
    </div>
  )
}
