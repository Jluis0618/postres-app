"use client"

import { useState, type ReactNode } from "react"
import { ChefHat, LoaderCircle, Minus, Plus, TriangleAlert } from "lucide-react"
import { cn } from "cn"
import { toast } from "sonner"
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
import { Switch } from "@/components/ui/switch"
import { registerProduction } from "@/app/actions/inventory"
import { formatQty } from "@/lib/format"
import type { SupplyUnit } from "@/lib/types"
import { useAction } from "@/lib/use-action"

export type ProductionLine = { name: string; unit: SupplyUnit; perUnit: number; available: number }

// "Hice 24 galletas": suma al stock del producto y, si se quiere, descuenta los insumos de la receta.
export function ProductionDialog({
  product,
  lines,
  children,
}: {
  product: { id: string; name: string; emoji: string; unit: string; stock_available: number; track_stock?: boolean }
  lines: ProductionLine[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const [consume, setConsume] = useState(true)
  const { pending, run } = useAction()
  const hasRecipe = lines.length > 0
  const deducting = hasRecipe && consume
  const missing = deducting ? lines.filter((l) => l.perUnit * qty > l.available + 1e-9) : []

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setQty(1)
          setConsume(true)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{product.emoji} Agregar al stock</DialogTitle>
          <DialogDescription>
            {product.name}. {product.track_stock === false ? "Desde ahora este producto llevará stock." : `Hay ${Number(product.stock_available)} hechos.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 py-2">
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={() => setQty((q) => Math.max(q - 1, 1))} aria-label="Uno menos">
            <Minus />
          </Button>
          <div className="text-center">
            <input
              inputMode="numeric"
              aria-label="Cantidad"
              className="w-24 bg-transparent text-center font-heading text-5xl font-semibold tabular-nums outline-none"
              value={qty}
              onChange={(e) => setQty(Math.max(Number(e.target.value.replace(/\D/g, "")) || 0, 0))}
              onBlur={() => setQty((q) => Math.max(q, 1))}
            />
            <div className="text-sm text-muted-foreground">{product.unit}</div>
          </div>
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={() => setQty((q) => q + 1)} aria-label="Uno más">
            <Plus />
          </Button>
        </div>

        {hasRecipe ? (
          <>
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Descontar los ingredientes de la receta</div>
                <div className="text-xs text-muted-foreground">Apágalo si los ingredientes ya se descontaron o no salieron del inventario.</div>
              </div>
              <Switch checked={consume} onCheckedChange={setConsume} />
            </label>
            {consume && (
              <ul className="flex flex-col divide-y rounded-xl border">
                {lines.map((l) => {
                  const need = l.perUnit * qty
                  const short = need > l.available + 1e-9
                  return (
                    <li key={l.name} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <span>{l.name}</span>
                      <span className={cn("tabular-nums", short ? "font-medium text-destructive" : "text-muted-foreground")}>
                        {formatQty(need, l.unit)} <span className="text-xs">de {formatQty(l.available, l.unit)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Este producto no tiene receta: solo se suma al stock, sin descontar ingredientes.
          </p>
        )}

        {missing.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            No alcanza: {missing.map((m) => `${formatQty(m.perUnit * qty - m.available, m.unit)} de ${m.name}`).join(", ")}. Registra la compra o apaga “Descontar los ingredientes”.
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="h-11"
            disabled={qty < 1 || missing.length > 0 || pending}
            onClick={async () => {
              const r = await run(() => registerProduction(product.id, qty, deducting))
              if (!r.ok) return
              if (r.data?.missing?.length) {
                toast.error(`No alcanza: ${r.data.missing.map((m) => `${formatQty(m.missing, m.unit)} de ${m.name}`).join(", ")}`)
                return
              }
              toast.success(`${qty} ${product.unit} de ${product.name} agregados al stock`)
              setOpen(false)
            }}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <ChefHat />} Agregar {qty > 0 ? qty : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
