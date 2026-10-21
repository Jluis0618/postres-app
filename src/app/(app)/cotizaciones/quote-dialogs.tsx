"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, Copy, LoaderCircle, Send, Store, Truck, X } from "lucide-react"
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
import { convertQuote, duplicateQuote, setQuoteStatus } from "@/app/actions/sales"
import { localToIso } from "@/lib/format"
import type { QuoteStatus } from "@/lib/types"
import { useAction } from "@/lib/use-action"

// Convierte una cotización en orden: solo falta saber cuándo y cómo se entrega.
export function ConvertQuoteDialog({ quoteId, number, address, children }: { quoteId: string; number: string; address?: string | null; children: ReactNode }) {
  const router = useRouter()
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("15:00")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [deliveryAddress, setDeliveryAddress] = useState(address ?? "")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Convertir {number} en orden</DialogTitle>
          <DialogDescription>Se copian el cliente, los productos y los precios. La cotización queda como aceptada.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="convertir-fecha">Fecha de entrega</Label>
              <Input id="convertir-fecha" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="convertir-hora">Hora</Label>
              <Input id="convertir-hora" type="time" className="h-11" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["pickup", "Retira", Store],
                ["delivery", "Envío", Truck],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDeliveryType(value)}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                  deliveryType === value ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          {deliveryType === "delivery" && (
            <div className="grid gap-2">
              <Label htmlFor="convertir-direccion">Dirección</Label>
              <Input id="convertir-direccion" className="h-11" placeholder="Calle, número, sector" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
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
            disabled={!date || pending}
            onClick={async () => {
              const r = await run(
                () =>
                  convertQuote({
                    quote_id: quoteId,
                    delivery_at: localToIso(date, time),
                    delivery_type: deliveryType,
                    delivery_address: deliveryType === "delivery" ? deliveryAddress : "",
                  }),
                (d) => `${number} convertida en la orden ${d?.number}`
              )
              if (r.ok && r.data) router.push(`/ordenes/${r.data.id}`)
            }}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            Crear orden <ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Botones de estado de la cotización: enviada, aceptada, rechazada, duplicar. */
export function QuoteStatusButtons({ quoteId, number, status }: { quoteId: string; number: string; status: QuoteStatus }) {
  const router = useRouter()
  const { pending, run } = useAction()
  const open = status === "draft" || status === "sent"
  const set = (s: QuoteStatus, message: string) => run(() => setQuoteStatus(quoteId, s), message)

  return (
    <>
      {status === "draft" && (
        <Button variant="outline" className="h-11" disabled={pending} onClick={() => set("sent", `${number} marcada como enviada`)}>
          <Send /> Marcar como enviada
        </Button>
      )}
      {open && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" disabled={pending} onClick={() => set("accepted", `${number} aceptada`)}>
            <Check /> Aceptada
          </Button>
          <Button variant="ghost" className="h-11 text-destructive hover:text-destructive" disabled={pending} onClick={() => set("rejected", `${number} rechazada`)}>
            <X /> Rechazada
          </Button>
        </div>
      )}
      {(status === "expired" || status === "rejected") && (
        <Button
          variant="outline"
          className="h-11"
          disabled={pending}
          onClick={async () => {
            const r = await run(() => duplicateQuote(quoteId), "Se creó una copia con fecha nueva")
            if (r.ok && r.data) router.push(`/cotizaciones/${r.data}`)
          }}
        >
          <Copy /> Duplicar con fecha nueva
        </Button>
      )}
    </>
  )
}
