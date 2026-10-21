"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { QtyInput } from "@/components/qty-input"
import { Check, CircleCheck, CookingPot, PackageCheck, Receipt, ShoppingCart, TriangleAlert, Truck, X } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { formatQty, orderStatus } from "@/lib/format"
import type { OrderStatus, SupplyUnit } from "@/lib/demo-data"

const steps: { status: OrderStatus; label: string }[] = [
  { status: "pending_confirmation", label: "Por confirmar" },
  { status: "pending", label: "Pendiente" },
  { status: "in_preparation", label: "En preparación" },
  { status: "ready", label: "Lista" },
  { status: "delivered", label: "Entregada" },
]

type Missing = { name: string; text: string }
type Consumed = { name: string; unit: SupplyUnit; quantity: number }

// Simula el flujo de la orden. Con Supabase, cada botón llamará a la función
// correspondiente (start_order_preparation, cancel_order, create_invoice…).
export function OrderActions({
  initialStatus,
  missing,
  hasInvoice,
  consumed,
}: {
  initialStatus: OrderStatus
  missing: Missing[]
  hasInvoice: boolean
  consumed: Consumed[]
}) {
  const [status, setStatus] = useState(initialStatus)
  const [shortage, setShortage] = useState<Missing[] | null>(null)
  const [restocked, setRestocked] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [invoiced, setInvoiced] = useState(hasInvoice)

  const current = steps.findIndex((s) => s.status === status)

  function go(next: OrderStatus, message: string) {
    setStatus(next)
    setNotice(message)
    setShortage(null)
  }

  function startPreparation() {
    if (missing.length > 0 && !restocked) {
      setShortage(missing)
      setNotice(null)
      return
    }
    go("in_preparation", "Listo: se descontaron los insumos de la receta.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          Estado
          <StatusBadge {...orderStatus[status]} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status !== "cancelled" && (
          <ol className="flex flex-col gap-0.5">
            {steps.map((s, i) => (
              <li key={s.status} className="flex items-center gap-3 py-1">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs",
                    i < current && "border-primary bg-primary text-primary-foreground",
                    i === current && "border-primary text-primary ring-4 ring-primary/15",
                    i > current && "text-muted-foreground"
                  )}
                >
                  {i < current ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn("text-sm", i === current ? "font-semibold" : i > current && "text-muted-foreground")}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        {shortage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <TriangleAlert className="size-4" /> No alcanzan los insumos
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {shortage.map((m) => (
                <li key={m.name}>
                  Faltan <strong>{m.text}</strong> de {m.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">La orden sigue pendiente. No se descontó nada.</p>
            <Button
              variant="outline"
              className="mt-3 h-10 w-full"
              onClick={() => {
                setRestocked(true)
                setShortage(null)
                setNotice("Compra registrada. Ya puedes iniciar la preparación.")
              }}
            >
              <ShoppingCart /> Registrar compra
            </Button>
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CircleCheck className="mt-0.5 size-4 shrink-0" /> {notice}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {status === "pending_confirmation" && (
            <Button size="lg" className="h-11" onClick={() => go("pending", "Pedido confirmado.")}>
              <Check /> Confirmar pedido
            </Button>
          )}
          {status === "pending" && (
            <Button size="lg" className="h-11" onClick={startPreparation}>
              <CookingPot /> Iniciar preparación
            </Button>
          )}
          {status === "in_preparation" && (
            <Button size="lg" className="h-11" onClick={() => go("ready", "Orden lista para entregar.")}>
              <PackageCheck /> Marcar como lista
            </Button>
          )}
          {status === "ready" && (
            <Button size="lg" className="h-11" onClick={() => go("delivered", "Orden entregada.")}>
              <Truck /> Marcar como entregada
            </Button>
          )}
          {(status === "ready" || status === "delivered") && !invoiced && (
            <Button
              size="lg"
              variant="outline"
              className="h-11"
              onClick={() => {
                setInvoiced(true)
                setNotice("Factura FAC-0009 creada.")
              }}
            >
              <Receipt /> Crear factura
            </Button>
          )}
          {!["delivered", "cancelled"].includes(status) && (
            <CancelOrderDialog
              confirmation={status === "pending_confirmation"}
              consumed={status === "in_preparation" || status === "ready" ? consumed : []}
              onConfirm={(message) => go("cancelled", message)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Cancelar: si ya se descontaron insumos, vuelven al inventario salvo lo que se marque como merma.
function CancelOrderDialog({
  confirmation,
  consumed,
  onConfirm,
}: {
  confirmation: boolean
  consumed: Consumed[]
  onConfirm: (message: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [waste, setWaste] = useState<Record<string, number>>({})
  const invalid = consumed.some((c) => (waste[c.name] ?? 0) > c.quantity)
  const wasted = consumed.filter((c) => (waste[c.name] ?? 0) > 0)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setWaste({})
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-10 text-destructive hover:text-destructive">
          <X /> {confirmation ? "Rechazar pedido" : "Cancelar orden"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{confirmation ? "¿Rechazar este pedido?" : "¿Cancelar esta orden?"}</DialogTitle>
          <DialogDescription>
            {consumed.length > 0
              ? "Los insumos que se descontaron vuelven al inventario. Si algo ya se usó y no se puede recuperar, anótalo como merma."
              : "No se descontó ningún insumo todavía, así que el inventario no cambia."}
          </DialogDescription>
        </DialogHeader>
        {consumed.length > 0 && (
          <div className="flex flex-col divide-y rounded-xl border">
            {consumed.map((c) => (
              <div key={c.name} className="grid grid-cols-[1fr_9.5rem] items-center gap-3 p-3">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Se usaron {formatQty(c.quantity, c.unit)}</div>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Merma</Label>
                  <QtyInput unit={c.unit} defaultUnit="small" onChange={(q) => setWaste((w) => ({ ...w, [c.name]: q }))} />
                </div>
              </div>
            ))}
          </div>
        )}
        {invalid && <p className="text-sm text-destructive">La merma no puede ser mayor que lo que se usó.</p>}
        <div className="grid gap-2">
          <Label htmlFor="cancelar-motivo">Motivo (opcional)</Label>
          <Textarea id="cancelar-motivo" placeholder={confirmation ? "Ej. no hay disponibilidad ese día" : "Ej. el cliente canceló"} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              Volver
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="h-11"
            disabled={invalid}
            onClick={() => {
              setOpen(false)
              onConfirm(
                consumed.length === 0
                  ? confirmation
                    ? "Pedido rechazado."
                    : "Orden cancelada."
                  : wasted.length > 0
                    ? `Orden cancelada. Merma registrada: ${wasted.map((c) => `${formatQty(waste[c.name], c.unit)} de ${c.name}`).join(", ")}. El resto volvió al inventario.`
                    : "Orden cancelada. Los insumos volvieron al inventario."
              )
            }}
          >
            {confirmation ? "Rechazar pedido" : "Cancelar orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
