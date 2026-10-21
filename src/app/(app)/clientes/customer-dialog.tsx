"use client"

import { useState, type ReactNode } from "react"
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
import type { Customer } from "@/lib/demo-data"
import { demoSaved } from "@/lib/demo"

export function CustomerDialog({ customer, children }: { customer?: Customer; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(customer?.name ?? "")
  const [phone, setPhone] = useState(customer?.phone ?? "")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{customer ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>Solo el nombre y el teléfono son obligatorios.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cliente-nombre">Nombre</Label>
            <Input id="cliente-nombre" className="h-11" placeholder="Persona o empresa" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente-telefono">Teléfono / WhatsApp</Label>
            <Input id="cliente-telefono" type="tel" inputMode="tel" className="h-11" placeholder="809-555-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente-correo">Correo</Label>
            <Input id="cliente-correo" type="email" className="h-11" defaultValue={customer?.email} placeholder="opcional" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cliente-direccion">Dirección</Label>
            <Input id="cliente-direccion" className="h-11" defaultValue={customer?.address} placeholder="Para los envíos" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente-rnc">RNC o cédula</Label>
            <Input id="cliente-rnc" className="h-11" placeholder="opcional" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cliente-notas">Notas</Label>
            <Textarea id="cliente-notas" placeholder="Alergias, gustos, cumpleaños…" />
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
            disabled={!name.trim() || !phone.trim()}
            onClick={() => {
              setOpen(false)
              demoSaved(customer ? `${name} actualizado` : `${name} agregado a clientes`)
            }}
          >
            {customer ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
