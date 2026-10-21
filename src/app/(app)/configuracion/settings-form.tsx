"use client"

import { useState } from "react"
import { CircleCheck, LoaderCircle, LogOut, TriangleAlert, UserPlus } from "lucide-react"
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
import { signOut } from "@/app/actions/auth"
import { inviteUser, retryWebhook, setUserRole, updateSettings } from "@/app/actions/settings"
import type { Profile, Settings, UserRole } from "@/lib/types"
import { useAction } from "@/lib/use-action"

type Delivery = { id: string; order_number: string; external_ref: string | null; status: "sent" | "failed" | "pending"; attempts: number; when: string; last_error: string | null }
type Integration = { apiKeyConfigured: boolean; webhookUrl: string | null; secretConfigured: boolean; adminKeyConfigured: boolean; apiBaseUrl: string }

const roleLabel = { admin: "Administradora", assistant: "Ayudante" } as const

export function SettingsForm({
  settings,
  users,
  currentUserId,
  deliveries,
  integration,
}: {
  settings: Settings
  users: Profile[]
  currentUserId: string
  deliveries: Delivery[]
  integration: Integration
}) {
  const { pending, run } = useAction()
  const [form, setForm] = useState({
    business_name: settings.business_name,
    tax_id: settings.tax_id ?? "",
    phone: settings.phone ?? "",
    address: settings.address ?? "",
    itbis_enabled: settings.itbis_enabled,
    itbis_rate: String(settings.itbis_rate),
    quote_validity_days: String(settings.quote_validity_days),
    quote_note: settings.quote_note ?? "",
    invoice_note: settings.invoice_note ?? "",
  })
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function save() {
    run(
      () =>
        updateSettings({
          business_name: form.business_name.trim(),
          tax_id: form.tax_id.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          itbis_enabled: form.itbis_enabled,
          itbis_rate: Number(form.itbis_rate) || 0,
          quote_validity_days: Math.max(Number(form.quote_validity_days) || 15, 1),
          quote_note: form.quote_note.trim() || null,
          invoice_note: form.invoice_note.trim() || null,
        }),
      "Configuración guardada"
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Negocio</CardTitle>
          <CardDescription>Sale en las cotizaciones y facturas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="negocio-nombre" label="Nombre del negocio" value={form.business_name} onChange={set("business_name")} />
          <Field id="negocio-rnc" label="RNC" value={form.tax_id} onChange={set("tax_id")} />
          <Field id="negocio-telefono" label="Teléfono" value={form.phone} onChange={set("phone")} />
          <Field id="negocio-direccion" label="Dirección" value={form.address} onChange={set("address")} />
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
            <Switch checked={form.itbis_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, itbis_enabled: v }))} />
          </label>
          {form.itbis_enabled && <Field id="itbis-tasa" label="Tasa de ITBIS (%)" value={form.itbis_rate} onChange={set("itbis_rate")} inputMode="decimal" />}
          <Field id="validez" label="Las cotizaciones vencen a los (días)" value={form.quote_validity_days} onChange={set("quote_validity_days")} inputMode="numeric" />
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="nota-cotizacion">Nota al pie de las cotizaciones</Label>
            <Textarea id="nota-cotizacion" value={form.quote_note} onChange={set("quote_note")} placeholder="Ej. Se requiere 50% de anticipo para confirmar." />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="nota-factura">Nota al pie de las facturas</Label>
            <Textarea id="nota-factura" value={form.invoice_note} onChange={set("invoice_note")} placeholder="Ej. Cuenta para transferencias…" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" className="h-12 px-6 text-base" disabled={pending || !form.business_name.trim()} onClick={save}>
          {pending && <LoaderCircle className="animate-spin" />}
          Guardar cambios
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuarios</CardTitle>
          <CardDescription>Quién puede entrar. Un ayudante maneja órdenes e inventario, pero no ve reportes ni configuración.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col divide-y rounded-xl border">
            {users.map((u) => (
              <UserRow key={u.id} user={u} isMe={u.id === currentUserId} />
            ))}
          </div>
          {integration.adminKeyConfigured ? (
            <InviteDialog />
          ) : (
            <p className="rounded-lg bg-muted/70 p-3 text-xs text-muted-foreground">
              Para invitar desde aquí falta configurar SUPABASE_SECRET_KEY en el servidor. Mientras tanto, crea el usuario en el panel de Supabase
              (Authentication → Users) y luego dale permisos aquí.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sistema de comisiones</CardTitle>
          <CardDescription>Tu sistema manda pedidos aquí y recibe un aviso cuando se pagan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ConfigCheck ok={integration.apiKeyConfigured} label="Llave de la API (COMMISSIONS_API_KEY)" />
          <ConfigCheck ok={!!integration.webhookUrl} label={integration.webhookUrl ? `Avisos a ${integration.webhookUrl}` : "Dirección de avisos (COMMISSIONS_WEBHOOK_URL)"} />
          <ConfigCheck ok={integration.secretConfigured} label="Firma de los avisos (COMMISSIONS_WEBHOOK_SECRET)" />
          <ConfigCheck ok={integration.adminKeyConfigured} label="Llave secreta de Supabase (SUPABASE_SECRET_KEY)" />
          <div className="rounded-lg bg-muted/70 p-3 font-mono text-xs break-all">
            POST {integration.apiBaseUrl}/api/v1/orders
            <br />
            GET {integration.apiBaseUrl}/api/v1/products
            <br />
            GET {integration.apiBaseUrl}/api/v1/orders/&lt;referencia&gt;
          </div>
          <div>
            <div className="mb-2 font-medium">Últimos avisos</div>
            {deliveries.length === 0 ? (
              <p className="text-muted-foreground">Todavía no se ha enviado ningún aviso.</p>
            ) : (
              <div className="flex flex-col divide-y rounded-xl border">
                {deliveries.map((d) => (
                  <DeliveryRow key={d.id} delivery={d} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <form action={signOut}>
        <Button variant="ghost" className="h-11 text-muted-foreground">
          <LogOut /> Cerrar sesión
        </Button>
      </form>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (e: { target: { value: string } }) => void
  inputMode?: "decimal" | "numeric"
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-11" value={value} onChange={onChange} inputMode={inputMode} />
    </div>
  )
}

function ConfigCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CircleCheck className="size-4 shrink-0 text-emerald-600" /> : <TriangleAlert className="size-4 shrink-0 text-amber-600" />}
      <span className={ok ? "" : "text-muted-foreground"}>
        {label}
        {!ok && " · falta configurar"}
      </span>
    </div>
  )
}

function UserRow({ user, isMe }: { user: Profile; isMe: boolean }) {
  const { pending, run } = useAction()
  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {user.name ?? user.email}
          {isMe && <span className="text-muted-foreground"> (tú)</span>}
        </div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
      {isMe ? (
        <StatusBadge label={user.role ? roleLabel[user.role] : "Sin acceso"} tone="progress" />
      ) : (
        <Select
          defaultValue={user.role ?? "none"}
          disabled={pending}
          onValueChange={(v) => run(() => setUserRole(user.id, v === "none" ? null : (v as UserRole)), `Permisos de ${user.name ?? user.email} actualizados`)}
        >
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
  )
}

function DeliveryRow({ delivery: d }: { delivery: Delivery }) {
  const { pending, run } = useAction()
  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          Factura pagada · {d.order_number} {d.external_ref && <span className="text-muted-foreground">({d.external_ref})</span>}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {d.when} · {d.attempts} {d.attempts === 1 ? "intento" : "intentos"}
          {d.last_error && d.status !== "sent" ? ` · ${d.last_error}` : ""}
        </div>
      </div>
      {d.status === "sent" ? (
        <StatusBadge label="Enviado" tone="success" />
      ) : (
        <>
          <StatusBadge label={d.status === "failed" ? "Falló" : "Pendiente"} tone={d.status === "failed" ? "danger" : "warning"} />
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => retryWebhook(d.id), `Aviso de ${d.order_number} enviado`)}>
            {pending && <LoaderCircle className="animate-spin" />}
            Reintentar
          </Button>
        </>
      )}
    </div>
  )
}

function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("assistant")
  const { pending, run } = useAction()
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setEmail("")
      }}
    >
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
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
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
            disabled={!email.includes("@") || pending}
            onClick={async () => {
              const r = await run(() => inviteUser(email, role), `Invitación enviada a ${email}`)
              if (r.ok) setOpen(false)
            }}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
