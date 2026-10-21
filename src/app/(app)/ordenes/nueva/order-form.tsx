"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Minus, Plus, Search, Sparkles, Store, Trash2, Truck, UserPlus } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { CustomerDialog } from "../../clientes/customer-dialog"
import { createOrder, createQuote } from "@/app/actions/sales"
import { addDays, dayKey, formatMoney, localToIso } from "@/lib/format"
import type { PaymentMethod } from "@/lib/types"
import { useAction } from "@/lib/use-action"

type ProductOption = { id: string; name: string; price: number; unit: string; emoji: string; stock: number | null }
type CustomerOption = { id: string; name: string; phone: string | null }
type Line = { key: string; productId: string | null; description: string; unitPrice: number; quantity: number; customization: string; emoji: string }

// Sirve para órdenes y cotizaciones: la cotización no lleva entrega ni anticipo, sino una fecha de vencimiento.
export function OrderForm({
  products,
  customers: initialCustomers,
  mode = "order",
  defaultCustomerId,
  validityDays = 15,
  taxRate = 0,
}: {
  products: ProductOption[]
  customers: CustomerOption[]
  mode?: "order" | "quote"
  defaultCustomerId?: string
  validityDays?: number
  taxRate?: number
}) {
  const isQuote = mode === "quote"
  const router = useRouter()
  const { pending, run } = useAction()
  const [customers, setCustomers] = useState(initialCustomers)
  const [customerId, setCustomerId] = useState<string | undefined>(defaultCustomerId)
  const [date, setDate] = useState(() => (isQuote ? addDays(dayKey(new Date()), validityDays) : ""))
  const [time, setTime] = useState("15:00")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [address, setAddress] = useState("")
  const [lines, setLines] = useState<Line[]>([])
  const [query, setQuery] = useState("")
  const [discount, setDiscount] = useState(0)
  const [deposit, setDeposit] = useState(0)
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>("transfer")
  const [notes, setNotes] = useState("")

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const base = Math.max(subtotal - discount, 0)
  const tax = Math.round(base * taxRate) / 100
  const total = base + tax
  const visible = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  const missing = !customerId ? "Elige un cliente" : lines.length === 0 ? "Agrega al menos un producto" : !date ? (isQuote ? "Elige hasta cuándo es válida" : "Elige la fecha de entrega") : null

  function add(p: ProductOption) {
    setLines((prev) =>
      prev.some((l) => l.productId === p.id)
        ? prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { key: p.id, productId: p.id, description: p.name, unitPrice: p.price, quantity: 1, customization: "", emoji: p.emoji }]
    )
  }

  function addCustom() {
    setLines((prev) => [
      ...prev,
      { key: `custom-${Date.now()}`, productId: null, description: "", unitPrice: 0, quantity: 1, customization: "", emoji: "✨" },
    ])
  }

  function update(key: string, change: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...change } : l)).filter((l) => l.quantity > 0))
  }

  async function save() {
    const items = lines.map((l) => ({
      product_id: l.productId,
      description: l.description.trim() || "Ítem especial",
      quantity: l.quantity,
      unit_price: l.unitPrice,
      customization: l.customization,
    }))
    if (isQuote) {
      const r = await run(
        () => createQuote({ customer_id: customerId!, valid_until: date, discount, notes, items }),
        (d) => `Cotización ${d?.number} creada`
      )
      if (r.ok && r.data) router.push(`/cotizaciones/${r.data.id}`)
    } else {
      const r = await run(
        () =>
          createOrder({
            customer_id: customerId!,
            delivery_at: localToIso(date, time),
            delivery_type: deliveryType,
            delivery_address: deliveryType === "delivery" ? address : "",
            discount,
            notes,
            items,
            deposit: { amount: deposit, method: depositMethod },
          }),
        (d) => `Orden ${d?.number} creada`
      )
      if (r.ok && r.data) router.push(`/ordenes/${r.data.id}`)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isQuote ? "Cliente" : "Cliente y entrega"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Cliente</Label>
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-11 min-w-0 flex-1">
                    <SelectValue placeholder="Elige un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CustomerDialog
                  onSaved={(c) => {
                    setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))
                    setCustomerId(c.id)
                  }}
                >
                  <Button variant="outline" className="h-11">
                    <UserPlus /> <span className="hidden sm:inline">Nuevo</span>
                  </Button>
                </CustomerDialog>
              </div>
            </div>
            {isQuote ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="valida">Válida hasta</Label>
                <Input id="valida" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fecha">Fecha de entrega</Label>
                  <Input id="fecha" type="date" className="h-11" value={date} min={dayKey(new Date())} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="hora">Hora</Label>
                  <Input id="hora" type="time" className="h-11" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label>Tipo de entrega</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["pickup", "Retira en el local", Store],
                        ["delivery", "Envío a domicilio", Truck],
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
                </div>
                {deliveryType === "delivery" && (
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input id="direccion" className="h-11" placeholder="Calle, número, sector" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agregar productos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-11 pl-9" placeholder="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  className="flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-sm leading-tight font-medium">{p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatMoney(p.price)} / {p.unit}
                  </span>
                  {p.stock !== null && p.stock > 0 && <span className="text-xs text-emerald-700 dark:text-emerald-400">{p.stock} hechos</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={addCustom}
                className="flex flex-col items-start justify-center gap-1 rounded-xl border border-dashed p-3 text-left text-muted-foreground transition-colors hover:bg-muted"
              >
                <Sparkles className="size-6" />
                <span className="text-sm leading-tight font-medium">Ítem especial</span>
                <span className="text-xs">Algo que no está en el catálogo</span>
              </button>
            </div>
            {products.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay productos. Créalos en Inventario → Productos.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="text-lg">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {lines.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Toca un producto para agregarlo</p>}
          {lines.map((l) => (
            <div key={l.key} className="flex flex-col gap-2">
              {l.productId ? (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {l.emoji} {l.description}
                  </span>
                  <span className="text-sm tabular-nums">{formatMoney(l.quantity * l.unitPrice)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input className="h-9 min-w-0 flex-1 text-sm" placeholder="¿Qué es?" value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} />
                  <Input
                    className="h-9 w-24 text-right text-sm"
                    inputMode="decimal"
                    placeholder="Precio"
                    value={l.unitPrice || ""}
                    onChange={(e) => update(l.key, { unitPrice: Number(e.target.value) || 0 })}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border">
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => update(l.key, { quantity: l.quantity - 1 })} aria-label="Quitar uno">
                    <Minus />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => update(l.key, { quantity: l.quantity + 1 })} aria-label="Agregar uno">
                    <Plus />
                  </Button>
                </div>
                <Input
                  className="h-9 flex-1 text-sm"
                  placeholder="Personalización"
                  value={l.customization}
                  onChange={(e) => update(l.key, { customization: e.target.value })}
                />
                <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" onClick={() => update(l.key, { quantity: 0 })} aria-label="Eliminar">
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descuento" className="text-xs">
                Descuento (RD$)
              </Label>
              <Input id="descuento" type="number" min={0} inputMode="numeric" className="h-10" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
            </div>
            {!isQuote && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="anticipo" className="text-xs">
                  Anticipo (RD$)
                </Label>
                <Input id="anticipo" type="number" min={0} inputMode="numeric" className="h-10" value={deposit || ""} onChange={(e) => setDeposit(Number(e.target.value) || 0)} />
              </div>
            )}
          </div>
          {!isQuote && deposit > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">El anticipo se pagó con</Label>
              <Select value={depositMethod} onValueChange={(v) => setDepositMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notas" className="text-xs">
              Notas
            </Label>
            <Textarea
              id="notas"
              placeholder={isQuote ? "Detalles para el cliente: sabores, decoración…" : "Alergias, instrucciones de entrega…"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Descuento</dt>
                <dd className="tabular-nums">− {formatMoney(discount)}</dd>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>ITBIS ({taxRate}%)</dt>
                <dd className="tabular-nums">{formatMoney(tax)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(total)}</dd>
            </div>
            {!isQuote && deposit > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Queda por cobrar</dt>
                <dd className="tabular-nums">{formatMoney(Math.max(total - deposit, 0))}</dd>
              </div>
            )}
          </dl>

          <Button size="lg" className="h-12 text-base" disabled={!!missing || pending} onClick={save}>
            {pending && <LoaderCircle className="animate-spin" />}
            {isQuote ? "Guardar cotización" : "Guardar orden"}
          </Button>
          {missing && <p className="-mt-2 text-center text-xs text-muted-foreground">{missing}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
