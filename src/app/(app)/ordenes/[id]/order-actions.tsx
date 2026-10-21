"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CookingPot, LoaderCircle, PackageCheck, Receipt, RotateCcw, ShoppingCart, TriangleAlert, Truck, X } from "lucide-react"
import { cn } from "cn"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { StatusBadge } from "@/components/status-badge"
import { cancelOrder, createInvoice, setOrderStatus, startPreparation } from "@/app/actions/sales"
import { formatQty, orderStatus } from "@/lib/format"
import type { Missing, OrderStatus, SupplyUnit } from "@/lib/types"
import { useAction } from "@/lib/use-action"

const steps: { status: OrderStatus; label: string }[] = [
  { status: "pending_confirmation", label: "Por confirmar" },
  { status: "pending", label: "Pendiente" },
  { status: "in_preparation", label: "En preparación" },
  { status: "ready", label: "Lista" },
  { status: "delivered", label: "Entregada" },
]

type Consumed = { supply_id: string; name: string; unit: SupplyUnit; quantity: number }

export function OrderActions({
  orderId,
  status,
  invoice,
  consumed,
}: {
  orderId: string
  status: OrderStatus
  invoice: { id: string; number: string } | null
  consumed: Consumed[]
}) {
  const router = useRouter()
  const { pending, run } = useAction()
  const [missing, setMissing] = useState<Missing[] | null>(null)
  const current = steps.findIndex((s) => s.status === status)

  async function prepare() {
    setMissing(null)
    const r = await run(() => startPreparation(orderId))
    if (!r.ok) return
    if (r.data?.missing?.length) setMissing(r.data.missing)
    else toast.success("En preparación. Se descontaron los insumos de la receta.")
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
                <span className={cn("text-sm", i === current ? "font-semibold" : i > current && "text-muted-foreground")}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}

        {missing && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <TriangleAlert className="size-4" /> No alcanzan los insumos
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {missing.map((m) => (
                <li key={m.supply_id}>
                  Faltan <strong>{formatQty(m.missing, m.unit)}</strong> de {m.name} (hay {formatQty(m.available, m.unit)})
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">La orden sigue pendiente. No se descontó nada.</p>
            <Button variant="outline" className="mt-3 h-10 w-full" asChild>
              <Link href="/inventario">
                <ShoppingCart /> Registrar compra en Inventario
              </Link>
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {status === "pending_confirmation" && (
            <Button size="lg" className="h-11" disabled={pending} onClick={() => run(() => setOrderStatus(orderId, "pending"), "Pedido confirmado")}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />} Confirmar pedido
            </Button>
          )}
          {status === "pending" && (
            <Button size="lg" className="h-11" disabled={pending} onClick={prepare}>
              {pending ? <LoaderCircle className="animate-spin" /> : <CookingPot />} Iniciar preparación
            </Button>
          )}
          {status === "in_preparation" && (
            <Button size="lg" className="h-11" disabled={pending} onClick={() => run(() => setOrderStatus(orderId, "ready"), "Orden lista para entregar")}>
              {pending ? <LoaderCircle className="animate-spin" /> : <PackageCheck />} Marcar como lista
            </Button>
          )}
          {status === "ready" && (
            <Button size="lg" className="h-11" disabled={pending} onClick={() => run(() => setOrderStatus(orderId, "delivered"), "Orden entregada")}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Truck />} Marcar como entregada
            </Button>
          )}
          {(status === "ready" || status === "delivered") && !invoice && (
            <Button
              size="lg"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={async () => {
                const r = await run(() => createInvoice(orderId), (d) => `Factura ${d?.number} creada`)
                if (r.ok && r.data) router.push(`/facturas/${r.data.id}`)
              }}
            >
              <Receipt /> Crear factura
            </Button>
          )}
          {invoice && (
            <Button variant="outline" className="h-11" asChild>
              <Link href={`/facturas/${invoice.id}`}>
                <Receipt /> Ver factura {invoice.number}
              </Link>
            </Button>
          )}
          {status === "ready" && (
            <Button variant="ghost" className="h-10 text-muted-foreground" disabled={pending} onClick={() => run(() => setOrderStatus(orderId, "in_preparation"))}>
              <RotateCcw /> Volver a preparación
            </Button>
          )}
          {status === "delivered" && !invoice && (
            <Button variant="ghost" className="h-10 text-muted-foreground" disabled={pending} onClick={() => run(() => setOrderStatus(orderId, "ready"))}>
              <RotateCcw /> Deshacer entrega
            </Button>
          )}
          {!["delivered", "cancelled"].includes(status) && !invoice && (
            <CancelOrderDialog
              orderId={orderId}
              confirmation={status === "pending_confirmation"}
              consumed={status === "in_preparation" || status === "ready" ? consumed : []}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Cancelar: si ya se descontaron insumos, vuelven al inventario salvo lo que se marque como merma.
function CancelOrderDialog({ orderId, confirmation, consumed }: { orderId: string; confirmation: boolean; consumed: Consumed[] }) {
  const [open, setOpen] = useState(false)
  const [waste, setWaste] = useState<Record<string, number>>({})
  const [reason, setReason] = useState("")
  const { pending, run } = useAction()
  const invalid = consumed.some((c) => (waste[c.supply_id] ?? 0) > c.quantity + 1e-9)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setWaste({})
          setReason("")
        }
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
              <div key={c.supply_id} className="grid grid-cols-[1fr_9.5rem] items-center gap-3 p-3">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Se usaron {formatQty(c.quantity, c.unit)}</div>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Merma</Label>
                  <QtyInput unit={c.unit} defaultUnit="small" onChange={(q) => setWaste((w) => ({ ...w, [c.supply_id]: q }))} />
                </div>
              </div>
            ))}
          </div>
        )}
        {invalid && <p className="text-sm text-destructive">La merma no puede ser mayor que lo que se usó.</p>}
        <div className="grid gap-2">
          <Label htmlFor="cancelar-motivo">Motivo (opcional)</Label>
          <Textarea
            id="cancelar-motivo"
            placeholder={confirmation ? "Ej. no hay disponibilidad ese día" : "Ej. el cliente canceló"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
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
            disabled={invalid || pending}
            onClick={async () => {
              const r = await run(
                () =>
                  cancelOrder(
                    orderId,
                    Object.entries(waste).map(([supply_id, quantity]) => ({ supply_id, quantity })),
                    reason
                  ),
                confirmation ? "Pedido rechazado" : consumed.length ? "Orden cancelada. Los insumos volvieron al inventario." : "Orden cancelada"
              )
              if (r.ok) setOpen(false)
            }}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {confirmation ? "Rechazar pedido" : "Cancelar orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
