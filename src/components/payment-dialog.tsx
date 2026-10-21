"use client"

import { useState, type ReactNode } from "react"
import { Banknote, CreditCard, Landmark, LoaderCircle, Trash2, Wallet } from "lucide-react"
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
import { addPayment, deletePayment } from "@/app/actions/sales"
import { formatMoney } from "@/lib/format"
import type { PaymentMethod } from "@/lib/types"
import { useAction } from "@/lib/use-action"

const methods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "transfer", label: "Transferencia", icon: Landmark },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "other", label: "Otro", icon: Wallet },
]

// Los pagos van a la orden: sirve igual para un anticipo o para el pago final de la factura.
export function PaymentDialog({
  orderId,
  reference,
  total,
  paid,
  children,
}: {
  orderId: string
  reference: string
  total: number
  paid: number
  children: ReactNode
}) {
  const balance = Math.max(total - paid, 0)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [ref, setRef] = useState("")
  const { pending, run } = useAction()
  const value = Number(amount.replace(",", ".")) || 0
  const after = Math.max(balance - value, 0)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setAmount("")
          setRef("")
          setMethod("cash")
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Registrar pago</DialogTitle>
          <DialogDescription>
            {reference} · Falta por cobrar {formatMoney(balance)} de {formatMoney(total)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pago-monto">Monto (RD$)</Label>
            <Input
              id="pago-monto"
              inputMode="decimal"
              className="h-14 text-center font-heading text-3xl font-semibold"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10" onClick={() => setAmount(String(Math.round(balance / 2)))}>
                La mitad ({formatMoney(Math.round(balance / 2))})
              </Button>
              <Button variant="outline" className="h-10" onClick={() => setAmount(String(balance))}>
                Todo ({formatMoney(balance)})
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Método</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {methods.map(({ value: v, label, icon: Icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMethod(v)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-colors",
                    method === v ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                  )}
                >
                  <Icon className="size-5" /> {label}
                </button>
              ))}
            </div>
          </div>
          {method !== "cash" && (
            <div className="grid gap-2">
              <Label htmlFor="pago-referencia">Referencia o banco</Label>
              <Input id="pago-referencia" className="h-11" placeholder="Ej. Popular #48213" value={ref} onChange={(e) => setRef(e.target.value)} />
            </div>
          )}
          {value > 0 && (
            <p className="rounded-lg bg-muted/70 p-3 text-sm">
              {after === 0 ? (
                <>
                  Queda <strong>pagada completa</strong>.
                </>
              ) : (
                <>
                  Después de este pago faltarán <strong>{formatMoney(after)}</strong>.
                </>
              )}
            </p>
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
            disabled={value <= 0 || pending}
            onClick={async () => {
              const r = await run(
                () => addPayment({ order_id: orderId, amount: value, method, reference: ref }),
                `Pago de ${formatMoney(value)} registrado`
              )
              if (r.ok) setOpen(false)
            }}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            Registrar {value > 0 ? formatMoney(value) : "pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Borra un pago registrado por error (pide confirmación). */
export function DeletePaymentButton({ paymentId, label }: { paymentId: string; label: string }) {
  const { pending, run } = useAction()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      aria-label={`Borrar ${label}`}
      disabled={pending}
      onClick={() => {
        if (confirm(`¿Borrar ${label}? Hazlo solo si se registró por error.`)) run(() => deletePayment(paymentId), "Pago borrado")
      }}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
    </Button>
  )
}
