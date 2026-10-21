"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Plus, Trash2 } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Category, SupplyUnit } from "@/lib/demo-data"
import { demoSaved } from "@/lib/demo"
import { formatMoney } from "@/lib/format"

type SupplyOption = { id: string; name: string; unit: SupplyUnit; unit_cost: number }
type Line = { key: number; supplyId?: string; qty: string }
type Initial = {
  name: string
  category_id: string
  price: number
  unit: string
  emoji: string
  track_stock: boolean
  recipe_yield: number
  lines: { supply_id: string; quantity: number }[]
}

const unitLabel: Record<SupplyUnit, string> = { g: "g", ml: "ml", unit: "u" }
const emojis = ["🎂", "🍰", "🧁", "🍓", "🍮", "🍪", "🍫", "🥧", "🍩", "🕯️", "✨", "🎁"]

export function ProductForm({
  initial,
  categories,
  supplies,
}: {
  initial?: Initial
  categories: Category[]
  supplies: SupplyOption[]
}) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? "")
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🎂")
  const [price, setPrice] = useState(initial ? String(initial.price) : "")
  const [trackStock, setTrackStock] = useState(initial?.track_stock ?? false)
  const [recipeYield, setRecipeYield] = useState(String(initial?.recipe_yield ?? 1))
  const [lines, setLines] = useState<Line[]>(
    initial?.lines.map((l, i) => ({ key: i, supplyId: l.supply_id, qty: String(l.quantity) })) ?? [{ key: 0, qty: "" }]
  )

  const byId = new Map(supplies.map((s) => [s.id, s]))
  const batchCost = lines.reduce((sum, l) => {
    const s = l.supplyId ? byId.get(l.supplyId) : undefined
    return sum + (s ? (Number(l.qty) || 0) * s.unit_cost : 0)
  }, 0)
  const unitCost = batchCost / (Number(recipeYield) || 1)
  const priceNum = Number(price) || 0
  const margin = priceNum - unitCost
  const marginPct = priceNum > 0 ? Math.round((margin / priceNum) * 100) : 0

  function setLine(key: number, change: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...change } : l)))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos del producto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Ícono o foto</Label>
              <div className="flex flex-wrap items-center gap-2">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl border text-xl transition-colors",
                      emoji === e ? "border-primary bg-accent" : "hover:bg-muted"
                    )}
                  >
                    {e}
                  </button>
                ))}
                <button type="button" className="flex h-11 items-center gap-2 rounded-xl border border-dashed px-3 text-sm text-muted-foreground hover:bg-muted">
                  <ImagePlus className="size-4" /> Subir foto
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="producto-nombre">Nombre</Label>
              <Input id="producto-nombre" className="h-11" placeholder="Ej. Torta de zanahoria" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Categoría</Label>
              <Select defaultValue={initial?.category_id}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Elige una" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="producto-precio">Precio (RD$)</Label>
                <Input id="producto-precio" inputMode="decimal" className="h-11" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="producto-unidad">Se vende por</Label>
                <Input id="producto-unidad" className="h-11" defaultValue={initial?.unit ?? "unidad"} />
              </div>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="producto-descripcion">Descripción</Label>
              <Textarea id="producto-descripcion" placeholder="Sale en las cotizaciones" />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
              <div>
                <div className="text-sm font-medium">Tengo unidades hechas</div>
                <div className="text-xs text-muted-foreground">
                  Actívalo si a veces lo tienes listo en vitrina. Las órdenes usarán primero lo que ya está hecho.
                </div>
              </div>
              <Switch checked={trackStock} onCheckedChange={setTrackStock} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receta</CardTitle>
            <CardDescription>Con esto se descuentan los insumos y se calcula el costo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Esta receta rinde
              <Input inputMode="numeric" className="h-10 w-20 text-center" value={recipeYield} onChange={(e) => setRecipeYield(e.target.value)} />
              {initial?.unit ?? "unidad"}(es)
            </div>
            {lines.map((l) => {
              const s = l.supplyId ? byId.get(l.supplyId) : undefined
              return (
                <div key={l.key} className="flex items-center gap-2">
                  <Select value={l.supplyId} onValueChange={(v) => setLine(l.key, { supplyId: v })}>
                    <SelectTrigger className="h-11 min-w-0 flex-1">
                      <SelectValue placeholder="Insumo" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplies.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex w-32 items-center">
                    <Input
                      inputMode="decimal"
                      className="h-11 rounded-r-none text-right"
                      placeholder="0"
                      value={l.qty}
                      onChange={(e) => setLine(l.key, { qty: e.target.value })}
                    />
                    <span className="flex h-11 w-10 items-center justify-center rounded-r-lg border border-l-0 bg-muted text-sm text-muted-foreground">
                      {s ? unitLabel[s.unit] : "–"}
                    </span>
                  </div>
                  <span className="hidden w-20 text-right text-sm text-muted-foreground tabular-nums sm:block">
                    {s ? formatMoney((Number(l.qty) || 0) * s.unit_cost) : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 text-muted-foreground"
                    aria-label="Quitar ingrediente"
                    onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )
            })}
            <Button
              variant="outline"
              className="h-11 w-fit"
              onClick={() => setLines((prev) => [...prev, { key: Math.max(-1, ...prev.map((x) => x.key)) + 1, qty: "" }])}
            >
              <Plus /> Agregar ingrediente
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-3xl">{emoji}</span>
            <div className="min-w-0">
              <div className="truncate font-medium">{name || "Producto nuevo"}</div>
              <div className="font-heading text-2xl font-semibold tabular-nums">{formatMoney(priceNum)}</div>
            </div>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Costo por unidad</dt>
              <dd className="tabular-nums">{formatMoney(Math.round(unitCost))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ganancia</dt>
              <dd className="tabular-nums">{formatMoney(Math.round(margin))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Margen</dt>
              <dd className={cn("font-semibold tabular-nums", marginPct < 50 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                {marginPct}%
              </dd>
            </div>
          </dl>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.max(marginPct, 0), 100)}%` }} />
          </div>
          {priceNum > 0 && marginPct < 50 && (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Menos de 50% de margen. Revisa el precio o la receta.
            </p>
          )}
          <Button
            size="lg"
            className="h-12 text-base"
            disabled={!name.trim()}
            onClick={() => {
              demoSaved(initial ? `${name} actualizado` : `${name} agregado al catálogo`)
              router.push("/inventario?tab=productos")
            }}
          >
            {initial ? "Guardar cambios" : "Crear producto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
