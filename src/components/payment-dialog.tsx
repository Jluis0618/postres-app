"use client"

import { useState, type ReactNode } from "react"
import { Banknote, CreditCard, Landmark, Wallet } from "lucide-react"
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
import { demoSaved } from "@/lib/demo"
import { formatMoney } from "@/lib/format"

const methods = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "transfer", label: "Transferencia", icon: Landmark },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "other", label: "Otro", icon: Wallet },
] as const

// Los pagos van a la orden: sirve igual para un anticipo o para el pago final de la factura.
export function PaymentDialog({
  reference,
  total,
  paid,
  children,
}: {
  reference: string
  total: number
  paid: number
  children: ReactNode
}) {
  const balance = Math.max(total - paid, 0)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<(typeof methods)[number]["value"]>("cash")
  const value = Number(amount) || 0
  const after = Math.max(balance - value, 0)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setAmount("")
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
          {method === "transfer" && (
            <div className="grid gap-2">
              <Label htmlFor="pago-referencia">Referencia o banco</Label>
              <Input id="pago-referencia" className="h-11" placeholder="Ej. Popular #48213" />
            </div>
          )}
          {value > 0 && (
            <p className="rounded-lg bg-muted/70 p-3 text-sm">
              {after === 0 ? (
                <>Queda <strong>pagada completa</strong>.</>
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
            disabled={value <= 0}
            onClick={() => {
              setOpen(false)
              demoSaved(`Pago de ${formatMoney(value)} registrado`)
            }}
          >
            Registrar {value > 0 ? formatMoney(value) : "pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
