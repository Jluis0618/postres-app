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
import { registerProduction } from "@/app/actions/inventory"
import { formatQty } from "@/lib/format"
import type { SupplyUnit } from "@/lib/types"
import { useAction } from "@/lib/use-action"

export type ProductionLine = { name: string; unit: SupplyUnit; perUnit: number; available: number }

// "Hice 24 galletas": suma al stock del producto y descuenta los insumos de la receta.
export function ProductionDialog({
  product,
  lines,
  children,
}: {
  product: { id: string; name: string; emoji: string; unit: string; stock_available: number }
  lines: ProductionLine[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const { pending, run } = useAction()
  const missing = lines.filter((l) => l.perUnit * qty > l.available + 1e-9)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setQty(1)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{product.emoji} Registrar producción</DialogTitle>
          <DialogDescription>
            {product.name}. Hay {product.stock_available} hechos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 py-2">
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={() => setQty((q) => Math.max(q - 1, 1))} aria-label="Uno menos">
            <Minus />
          </Button>
          <div className="text-center">
            <div className="font-heading text-5xl font-semibold tabular-nums">{qty}</div>
            <div className="text-sm text-muted-foreground">{product.unit}</div>
          </div>
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={() => setQty((q) => q + 1)} aria-label="Uno más">
            <Plus />
          </Button>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Se descuentan de la receta</div>
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Este producto no tiene receta. Solo se sumará al stock.
            </p>
          ) : (
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
        </div>

        {missing.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            No alcanza: {missing.map((m) => `${formatQty(m.perUnit * qty - m.available, m.unit)} de ${m.name}`).join(", ")}.
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
            disabled={missing.length > 0 || pending}
            onClick={async () => {
              const r = await run(() => registerProduction(product.id, qty))
              if (!r.ok) return
              if (r.data?.missing?.length) {
                toast.error(`No alcanza: ${r.data.missing.map((m) => `${formatQty(m.missing, m.unit)} de ${m.name}`).join(", ")}`)
                return
              }
              toast.success(`${qty} ${product.unit} de ${product.name} agregados al stock`)
              setOpen(false)
            }}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <ChefHat />} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
