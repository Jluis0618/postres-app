"use client"

import { useState } from "react"
import Link from "next/link"
import { CakeSlice, Copy, KeyRound, LogOut, RefreshCw, Upload, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/status-badge"
import { demoSaved } from "@/lib/demo"

type Settings = {
  business_name: string
  phone: string
  address: string
  tax_id: string
  itbis_enabled: boolean
  itbis_rate: number
  quote_validity_days: number
  quote_note: string
  invoice_note: string
}
type User = { id: string; name: string; email: string; role: "admin" | "assistant" | null; last_seen: string }
type Delivery = { id: string; order_number: string; external_ref: string; status: "sent" | "failed" | "pending"; attempts: number; when: string }

const roleLabel = { admin: "Administradora", assistant: "Ayudante" } as const

export function SettingsForm({ settings, users, deliveries }: { settings: Settings; users: User[]; deliveries: Delivery[] }) {
  const [itbis, setItbis] = useState(settings.itbis_enabled)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Negocio</CardTitle>
          <CardDescription>Salen en las cotizaciones y facturas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <CakeSlice className="size-7" />
            </span>
            <Button variant="outline" className="h-11">
              <Upload /> Cambiar logo
            </Button>
          </div>
          <Field id="negocio-nombre" label="Nombre del negocio" defaultValue={settings.business_name} />
          <Field id="negocio-rnc" label="RNC" defaultValue={settings.tax_id} />
          <Field id="negocio-telefono" label="Teléfono" defaultValue={settings.phone} />
          <Field id="negocio-direccion" label="Dirección" defaultValue={settings.address} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cotizaciones y facturas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
            <div>
              <div className="text-sm font-medium">Cobrar ITBIS</div>
              <div className="text-xs text-muted-foreground">Solo afecta a los documentos nuevos. Los anteriores no cambian.</div>
            </div>
            <Switch checked={itbis} onCheckedChange={setItbis} />
          </label>
          {itbis && <Field id="itbis-tasa" label="Tasa de ITBIS (%)" defaultValue={String(settings.itbis_rate)} />}
          <Field id="validez" label="Las cotizaciones vencen a los (días)" defaultValue={String(settings.quote_validity_days)} />
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="nota-cotizacion">Nota al pie de las cotizaciones</Label>
            <Textarea id="nota-cotizacion" defaultValue={settings.quote_note} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="nota-factura">Nota al pie de las facturas</Label>
            <Textarea id="nota-factura" defaultValue={settings.invoice_note} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuarios</CardTitle>
          <CardDescription>Quién puede entrar al sistema. Un ayudante no ve reportes ni configuración.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col divide-y rounded-xl border">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {u.email} · entró: {u.last_seen.toLowerCase()}
                  </div>
                </div>
                {u.role === "admin" ? (
                  <StatusBadge label={roleLabel.admin} tone="progress" />
                ) : (
                  <Select defaultValue={u.role ?? "none"} onValueChange={() => demoSaved(`Permisos de ${u.name} actualizados`)}>
                    <SelectTrigger className="h-9 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assistant">{roleLabel.assistant}</SelectItem>
                      <SelectItem value="admin">{roleLabel.admin}</SelectItem>
                      <SelectItem value="none">Sin acceso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
          <InviteDialog />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sistema de comisiones</CardTitle>
          <CardDescription>Para que tu sistema mande pedidos aquí y reciba aviso cuando se pagan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Llave de la API</Label>
            <div className="flex gap-2">
              <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/60 px-3 font-mono text-sm">
                <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">pk_live_••••••••••••••••7f3a</span>
              </div>
              <Button variant="outline" size="icon" className="size-11" aria-label="Copiar llave" onClick={() => demoSaved("Llave copiada")}>
                <Copy />
              </Button>
              <Button variant="outline" className="h-11" onClick={() => demoSaved("Se generó una llave nueva. La anterior dejó de funcionar.")}>
                <RefreshCw /> Cambiar
              </Button>
            </div>
          </div>
          <Field id="webhook-url" label="Dirección del aviso de pago (webhook)" defaultValue="https://comisiones.tusistema.com/api/webhooks/postres" />
          <div>
            <div className="mb-2 text-sm font-medium">Últimos avisos enviados</div>
            <div className="flex flex-col divide-y rounded-xl border">
              {deliveries.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      Factura pagada · {d.order_number} <span className="text-muted-foreground">({d.external_ref})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.when} · {d.attempts} {d.attempts === 1 ? "intento" : "intentos"}
                    </div>
                  </div>
                  {d.status === "sent" ? (
                    <StatusBadge label="Enviado" tone="success" />
                  ) : (
                    <>
                      <StatusBadge label="Falló" tone="danger" />
                      <Button variant="outline" size="sm" onClick={() => demoSaved(`Aviso de ${d.order_number} reenviado`)}>
                        Reintentar
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="h-11 text-muted-foreground" asChild>
          <Link href="/login">
            <LogOut /> Cerrar sesión
          </Link>
        </Button>
        <Button size="lg" className="h-12 px-6 text-base" onClick={() => demoSaved("Configuración guardada")}>
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

function Field({ id, label, defaultValue }: { id: string; label: string; defaultValue?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-11" defaultValue={defaultValue} />
    </div>
  )
}

function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 w-fit">
          <UserPlus /> Invitar a alguien
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Invitar usuario</DialogTitle>
          <DialogDescription>Le llega un correo para crear su contraseña.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="invitar-correo">Correo</Label>
            <Input id="invitar-correo" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Permisos</Label>
            <Select defaultValue="assistant">
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assistant">Ayudante: órdenes e inventario</SelectItem>
                <SelectItem value="admin">Administradora: todo</SelectItem>
              </SelectContent>
            </Select>
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
            disabled={!email.includes("@")}
            onClick={() => {
              setOpen(false)
              demoSaved(`Invitación enviada a ${email}`)
            }}
          >
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
