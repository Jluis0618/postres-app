"use client"

import { useState, type ReactNode } from "react"
import { LoaderCircle } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { saveCustomer } from "@/app/actions/sales"
import type { Customer } from "@/lib/types"
import { useAction } from "@/lib/use-action"

const empty = { name: "", phone: "", email: "", address: "", tax_id: "", notes: "" }

/** Crear o editar cliente. onSaved recibe el id (sirve para elegirlo enseguida en una orden). */
export function CustomerDialog({
  customer,
  onSaved,
  children,
}: {
  customer?: Customer
  onSaved?: (customer: { id: string; name: string; phone: string }) => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const { pending, run } = useAction()
  const set = (field: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v)
          setForm({
            name: customer?.name ?? "",
            phone: customer?.phone ?? "",
            email: customer?.email ?? "",
            address: customer?.address ?? "",
            tax_id: customer?.tax_id ?? "",
            notes: customer?.notes ?? "",
          })
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{customer ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>Solo el nombre es obligatorio. Con el teléfono puedes escribirle por WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cliente-nombre">Nombre</Label>
            <Input id="cliente-nombre" className="h-11" placeholder="Persona o empresa" value={form.name} onChange={set("name")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente-telefono">Teléfono / WhatsApp</Label>
            <Input id="cliente-telefono" type="tel" inputMode="tel" className="h-11" placeholder="809-555-0000" value={form.phone} onChange={set("phone")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente-correo">Correo</Label>
            <Input id="cliente-correo" type="email" className="h-11" placeholder="opcional" value={form.email} onChange={set("email")} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cliente-direccion">Dirección</Label>
            <Input id="cliente-direccion" className="h-11" placeholder="Para los envíos" value={form.address} onChange={set("address")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente-rnc">RNC o cédula</Label>
            <Input id="cliente-rnc" className="h-11" placeholder="opcional" value={form.tax_id} onChange={set("tax_id")} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cliente-notas">Notas</Label>
            <Textarea id="cliente-notas" placeholder="Alergias, gustos, cumpleaños…" value={form.notes} onChange={set("notes")} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="h-11"
            disabled={!form.name.trim() || pending}
            onClick={async () => {
              const r = await run(
                () => saveCustomer({ id: customer?.id, ...form }),
                customer ? `${form.name} actualizado` : `${form.name} agregado a clientes`
              )
              if (r.ok) {
                setOpen(false)
                if (r.data) onSaved?.({ id: r.data, name: form.name.trim(), phone: form.phone.trim() })
              }
            }}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {customer ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
