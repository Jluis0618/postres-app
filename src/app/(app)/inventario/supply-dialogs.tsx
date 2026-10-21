"use client"

import { useState, type ReactNode } from "react"
import { ArrowRight, Pencil, ShoppingCart, SlidersHorizontal } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { QtyInput } from "@/components/qty-input"
import { StatusBadge } from "@/components/status-badge"
import type { Movement, MovementType, Supply, SupplyUnit } from "@/lib/demo-data"
import { demoSaved } from "@/lib/demo"
import { formatMoney, formatQty, formatShortDate } from "@/lib/format"

function costLabel(s: Pick<Supply, "unit" | "unit_cost">, cost = s.unit_cost) {
  return s.unit === "unit" ? `${formatMoney(cost)} / u` : `${formatMoney(cost * 1000)} / ${s.unit === "g" ? "kg" : "L"}`
}

// ---------------------------------------------------------------------------
// Registrar compra
// ---------------------------------------------------------------------------

export function PurchaseDialog({
  supplies,
  defaultSupplyId,
  children,
}: {
  supplies: Supply[]
  defaultSupplyId?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [supplyId, setSupplyId] = useState(defaultSupplyId)
  const [qty, setQty] = useState(0)
  const [cost, setCost] = useState(0)
  const supply = supplies.find((s) => s.id === supplyId)

  const newStock = supply ? supply.stock_on_hand + qty : 0
  const newCost = supply && qty > 0 ? (supply.stock_on_hand * supply.unit_cost + cost) / newStock : supply?.unit_cost ?? 0

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setSupplyId(defaultSupplyId)
          setQty(0)
          setCost(0)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Registrar compra</DialogTitle>
          <DialogDescription>Sube el stock y actualiza el costo del insumo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Insumo</Label>
            <Select value={supplyId} onValueChange={setSupplyId}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Elige un insumo" />
              </SelectTrigger>
              <SelectContent>
                {supplies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {supply && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="compra-cantidad">Cantidad comprada</Label>
                  <QtyInput key={supply.id} id="compra-cantidad" unit={supply.unit} onChange={setQty} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="compra-costo">Pagaste en total (RD$)</Label>
                  <Input
                    id="compra-costo"
                    inputMode="decimal"
                    className="h-11"
                    placeholder="0"
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="compra-proveedor">Proveedor</Label>
                  <Input id="compra-proveedor" className="h-11" defaultValue={supply.supplier} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="compra-fecha">Fecha</Label>
                  <Input id="compra-fecha" type="date" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/70 p-3 text-sm">
                <Preview label="Stock" before={formatQty(supply.stock_on_hand, supply.unit)} after={formatQty(newStock, supply.unit)} />
                <Preview label="Costo" before={costLabel(supply)} after={costLabel(supply, newCost)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="h-11"
            disabled={!supply || qty <= 0}
            onClick={() => {
              setOpen(false)
              demoSaved(`Compra de ${supply!.name} registrada`)
            }}
          >
            <ShoppingCart /> Registrar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Preview({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground">{before}</span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className="font-semibold">{after}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nuevo o editar insumo
// ---------------------------------------------------------------------------

const unitChoices: { value: SupplyUnit; label: string; hint: string }[] = [
  { value: "g", label: "Peso", hint: "g y kg" },
  { value: "ml", label: "Líquido", hint: "ml y L" },
  { value: "unit", label: "Unidades", hint: "huevos, cajas" },
]

export function SupplyFormDialog({ supply, children }: { supply?: Supply; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [unit, setUnit] = useState<SupplyUnit>(supply?.unit ?? "g")
  const [name, setName] = useState(supply?.name ?? "")
  const editing = !!supply

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{editing ? `Editar ${supply.name}` : "Nuevo insumo"}</DialogTitle>
          <DialogDescription>Ingredientes y empaques que compras para hacer los postres.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="insumo-nombre">Nombre</Label>
            <Input id="insumo-nombre" className="h-11" placeholder="Ej. Harina de trigo" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Se mide por</Label>
            <div className="grid grid-cols-3 gap-2">
              {unitChoices.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  disabled={editing}
                  onClick={() => setUnit(u.value)}
                  className={cn(
                    "rounded-lg border px-2 py-2.5 text-center transition-colors disabled:opacity-60",
                    unit === u.value ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                  )}
                >
                  <div className="text-sm font-medium">{u.label}</div>
                  <div className="text-xs text-muted-foreground">{u.hint}</div>
                </button>
              ))}
            </div>
            {editing && <p className="text-xs text-muted-foreground">La unidad no se cambia después de crear el insumo.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {!editing && (
              <div className="grid gap-2">
                <Label htmlFor="insumo-stock">Cuánto tienes hoy</Label>
                <QtyInput key={unit} id="insumo-stock" unit={unit} onChange={() => {}} />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="insumo-minimo">Avisarme cuando baje de</Label>
              <QtyInput key={`min-${unit}`} id="insumo-minimo" unit={unit} onChange={() => {}} placeholder={supply ? formatQty(supply.min_stock, unit) : "0"} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insumo-costo">Costo por {unit === "g" ? "kg" : unit === "ml" ? "litro" : "unidad"} (RD$)</Label>
              <Input
                id="insumo-costo"
                inputMode="decimal"
                className="h-11"
                defaultValue={supply ? String(unit === "unit" ? supply.unit_cost : supply.unit_cost * 1000) : ""}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insumo-proveedor">Proveedor</Label>
              <Input id="insumo-proveedor" className="h-11" defaultValue={supply?.supplier} placeholder="Dónde lo compras" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="insumo-notas">Notas</Label>
            <Textarea id="insumo-notas" placeholder="Marca preferida, presentación…" />
          </div>
          {editing && (
            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Activo</div>
                <div className="text-xs text-muted-foreground">Si lo desactivas, no sale en recetas ni en la lista de compras.</div>
              </div>
              <Switch defaultChecked />
            </label>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="h-11"
            disabled={!name.trim()}
            onClick={() => {
              setOpen(false)
              demoSaved(editing ? `${name} actualizado` : `${name} agregado al inventario`)
            }}
          >
            {editing ? "Guardar cambios" : "Crear insumo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Ajuste de conteo o merma
// ---------------------------------------------------------------------------

const wasteReasons = ["Se dañó", "Se venció", "Se cayó o se rompió", "Salió mal la receta", "Otro"]

export function AdjustmentDialog({ supply, children }: { supply: Supply; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"count" | "waste">("waste")
  const [qty, setQty] = useState(0)

  const after = mode === "count" ? qty : Math.max(supply.stock_on_hand - qty, 0)
  const diff = after - supply.stock_on_hand
  const tooMuch = mode === "waste" && qty > supply.stock_on_hand

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setQty(0)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Ajustar {supply.name}</DialogTitle>
          <DialogDescription>Hay {formatQty(supply.stock_on_hand, supply.unit)} según el sistema.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {(
            [
              ["waste", "Merma"],
              ["count", "Corregir conteo"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value)
                setQty(0)
              }}
              className={cn(
                "h-10 rounded-lg text-sm font-medium text-muted-foreground transition-colors",
                mode === value && "bg-background text-foreground shadow-sm"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ajuste-cantidad">{mode === "waste" ? "¿Cuánto se perdió?" : "¿Cuánto hay realmente?"}</Label>
            <QtyInput key={mode} id="ajuste-cantidad" unit={supply.unit} onChange={setQty} defaultUnit="small" />
          </div>
          {mode === "waste" ? (
            <div className="grid gap-2">
              <Label>Motivo</Label>
              <div className="flex flex-wrap gap-2">
                {wasteReasons.map((r) => (
                  <label key={r} className="cursor-pointer">
                    <input type="radio" name="motivo" className="peer sr-only" defaultChecked={r === wasteReasons[0]} />
                    <span className="inline-flex h-9 items-center rounded-full border px-3 text-sm peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground">
                      {r}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="ajuste-nota">Nota</Label>
              <Input id="ajuste-nota" className="h-11" placeholder="Ej. conteo del lunes" />
            </div>
          )}
          {qty > 0 && (
            <div
              className={cn(
                "rounded-xl p-3 text-sm",
                tooMuch ? "bg-destructive/10 text-destructive" : "bg-muted/70"
              )}
            >
              {tooMuch ? (
                <>No puedes registrar más merma de la que hay ({formatQty(supply.stock_on_hand, supply.unit)}).</>
              ) : (
                <Preview
                  label={diff < 0 ? `Baja ${formatQty(-diff, supply.unit)}` : `Sube ${formatQty(diff, supply.unit)}`}
                  before={formatQty(supply.stock_on_hand, supply.unit)}
                  after={formatQty(after, supply.unit)}
                />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="h-11"
            variant={mode === "waste" ? "destructive" : "default"}
            disabled={qty <= 0 || tooMuch}
            onClick={() => {
              setOpen(false)
              demoSaved(mode === "waste" ? `Merma de ${supply.name} registrada` : `Conteo de ${supply.name} corregido`)
            }}
          >
            {mode === "waste" ? "Registrar merma" : "Guardar conteo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Panel de detalle con historial (se abre al tocar un insumo)
// ---------------------------------------------------------------------------

const movementLabels: Record<MovementType, string> = {
  purchase: "Compra",
  order_consumption: "Usado en orden",
  order_return: "Devuelto de orden cancelada",
  production: "Producción",
  adjustment: "Ajuste",
  waste: "Merma",
}

export function SupplyDetailSheet({
  supply,
  supplies,
  movements,
  children,
}: {
  supply: Supply
  supplies: Supply[]
  movements: Movement[]
  children: ReactNode
}) {
  const low = supply.stock_on_hand < supply.min_stock
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl">{supply.name}</SheetTitle>
          <SheetDescription>{supply.supplier}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Fact label="Hay" value={formatQty(supply.stock_on_hand, supply.unit)} tone={low ? "text-destructive" : undefined} />
            <Fact label="Mínimo" value={formatQty(supply.min_stock, supply.unit)} />
            <Fact label="Costo" value={costLabel(supply)} />
          </div>
          {low && <StatusBadge label="Por debajo del mínimo" tone="danger" className="w-fit" />}
          <div className="grid grid-cols-3 gap-2">
            <PurchaseDialog supplies={supplies} defaultSupplyId={supply.id}>
              <Button variant="outline" className="h-auto flex-col gap-1 py-3">
                <ShoppingCart /> Compra
              </Button>
            </PurchaseDialog>
            <AdjustmentDialog supply={supply}>
              <Button variant="outline" className="h-auto flex-col gap-1 py-3">
                <SlidersHorizontal /> Ajuste
              </Button>
            </AdjustmentDialog>
            <SupplyFormDialog supply={supply}>
              <Button variant="outline" className="h-auto flex-col gap-1 py-3">
                <Pencil /> Editar
              </Button>
            </SupplyFormDialog>
          </div>
          <div>
            <h3 className="mb-2 font-heading text-lg font-semibold">Historial</h3>
            <ol className="flex flex-col divide-y">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{movementLabels[m.type]}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatShortDate(m.created_at)} · {m.note}
                    </div>
                  </div>
                  <span className={cn("text-sm font-medium tabular-nums", m.quantity > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                    {m.quantity > 0 ? "+" : "−"}
                    {formatQty(Math.abs(m.quantity), supply.unit)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/70 p-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold", tone)}>{value}</div>
    </div>
  )
}
