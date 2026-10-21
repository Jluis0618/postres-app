"use client"

import { useState } from "react"
import { Ban } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { demoSaved } from "@/lib/demo"

// Una factura no se edita ni se borra: se anula y, si hace falta, se crea otra desde la orden.
export function VoidInvoiceDialog({ number }: { number: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-11 text-destructive hover:text-destructive">
          <Ban /> Anular factura
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">¿Anular {number}?</DialogTitle>
          <DialogDescription>
            La factura queda marcada como anulada y deja de contar en las ventas. No se puede deshacer. Si hubo un error, después puedes facturar la orden otra vez.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="anular-motivo">Motivo</Label>
          <Textarea id="anular-motivo" placeholder="Ej. el precio estaba mal" value={reason} onChange={(e) => setReason(e.target.value)} />
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
            disabled={!reason.trim()}
            onClick={() => {
              setOpen(false)
              demoSaved(`${number} anulada`)
            }}
          >
            Anular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
