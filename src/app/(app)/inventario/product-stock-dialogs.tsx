"use client"

import { useState, type ReactNode } from "react"
import { ArrowRight, LoaderCircle, Minus, Plus } from "lucide-react"
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { adjustProductStock, getProductHistory, setProductTracking } from "@/app/actions/inventory"
import { formatShortDate, formatTime } from "@/lib/format"
import type { Movement } from "@/lib/types"
import { useAction } from "@/lib/use-action"
import { movementLabels } from "./supply-dialogs"

type StockProduct = { id: string; name: string; emoji: string; unit: string; stock_available: number }

const wasteReasons = ["Se dañó", "Se venció", "Se cayó", "Lo regalé o probé", "Otro"]

// Merma (se perdieron unidades) o corrección de conteo (hay realmente X).
export function ProductAdjustDialog({ product, children }: { product: StockProduct; children: ReactNode }) {
  const current = Number(product.stock_available)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"waste" | "count">("waste")
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState(wasteReasons[0])
  const [note, setNote] = useState("")
  const { pending, run } = useAction()

  const after = mode === "count" ? qty : Math.max(current - qty, 0)
  const tooMuch = mode === "waste" && qty > current
  const unchanged = after === current

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setMode(current > 0 ? "waste" : "count")
          setQty(current > 0 ? 1 : 0)
          setReason(wasteReasons[0])
          setNote("")
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {product.emoji} Ajustar {product.name}
          </DialogTitle>
          <DialogDescription>Hay {current} hechos según el sistema.</DialogDescription>
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
                setQty(value === "count" ? current : 1)
              }}
              className={cn("h-10 rounded-lg text-sm font-medium text-muted-foreground transition-colors", mode === value && "bg-background text-foreground shadow-sm")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-2">
          <Label>{mode === "waste" ? "¿Cuántos se perdieron?" : "¿Cuántos hay realmente?"}</Label>
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" className="size-11 rounded-full" onClick={() => setQty((q) => Math.max(q - 1, 0))} aria-label="Uno menos">
              <Minus />
            </Button>
            <input
              inputMode="numeric"
              aria-label="Cantidad"
              className="w-20 bg-transparent text-center font-heading text-4xl font-semibold tabular-nums outline-none"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
            <Button variant="outline" size="icon" className="size-11 rounded-full" onClick={() => setQty((q) => q + 1)} aria-label="Uno más">
              <Plus />
            </Button>
          </div>
        </div>

        {mode === "waste" ? (
          <div className="flex flex-wrap gap-2">
            {wasteReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn("inline-flex h-9 items-center rounded-full border px-3 text-sm", reason === r && "border-primary bg-accent text-accent-foreground")}
              >
                {r}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="ajuste-producto-nota">Nota</Label>
            <Input id="ajuste-producto-nota" className="h-11" placeholder="Ej. conteo de la vitrina" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}

        <div className={cn("flex items-center justify-center gap-2 rounded-xl p-3 text-sm", tooMuch ? "bg-destructive/10 text-destructive" : "bg-muted/70")}>
          {tooMuch ? (
            <>No puedes registrar más merma de la que hay ({current}).</>
          ) : (
            <>
              <span className="text-muted-foreground">{current} hechos</span>
              <ArrowRight className="size-4 text-muted-foreground" />
              <span className="font-semibold">{after} hechos</span>
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
            variant={mode === "waste" ? "destructive" : "default"}
            disabled={tooMuch || unchanged || pending}
            onClick={async () => {
              const r = await run(
                () => adjustProductStock({ product_id: product.id, mode, quantity: qty, note: mode === "waste" ? reason : note }),
                mode === "waste" ? `Merma de ${product.name} registrada` : `Conteo de ${product.name} corregido`
              )
              if (r.ok) setOpen(false)
            }}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {mode === "waste" ? "Registrar merma" : "Guardar conteo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Historial de entradas y salidas de un producto hecho.
export function ProductHistorySheet({ product, children }: { product: StockProduct; children: ReactNode }) {
  const [movements, setMovements] = useState<Movement[] | null>(null)
  const history = useAction()
  const tracking = useAction()

  return (
    <Sheet
      onOpenChange={async (open) => {
        if (!open) return
        const r = await history.run(() => getProductHistory(product.id))
        if (r.ok) setMovements(r.data ?? [])
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl">
            {product.emoji} {product.name}
          </SheetTitle>
          <SheetDescription>{Number(product.stock_available)} hechos ahora</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <h3 className="font-heading text-lg font-semibold">Historial</h3>
          {history.pending && !movements && (
            <div className="flex justify-center py-6">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {movements?.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay movimientos.</p>}
          <ol className="flex flex-col divide-y">
            {movements?.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.type === "order_sale" ? "Salió en orden" : m.type === "production" ? "Producción" : movementLabels[m.type]}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatShortDate(m.created_at)} {formatTime(m.created_at)}
                    {m.order ? ` · ${m.order.number}` : ""}
                    {m.notes && m.notes !== "Producción" ? ` · ${m.notes}` : ""}
                  </div>
                </div>
                <span className={cn("text-sm font-medium tabular-nums", m.quantity > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                  {m.quantity > 0 ? "+" : "−"}
                  {Math.abs(Number(m.quantity))}
                </span>
              </li>
            ))}
          </ol>
          <Button
            variant="ghost"
            className="mt-2 h-10 w-fit text-muted-foreground"
            disabled={tracking.pending}
            onClick={() => tracking.run(() => setProductTracking(product.id, false), `${product.name} ya no lleva stock`)}
          >
            Dejar de llevar stock de este producto
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
