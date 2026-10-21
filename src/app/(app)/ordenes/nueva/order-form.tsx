"use client"

import { useState } from "react"
import Link from "next/link"
import { CircleCheck, Minus, Plus, Search, Store, Trash2, Truck } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney } from "@/lib/format"

type ProductOption = { id: string; name: string; price: number; unit: string; emoji: string; stock: number | null }
type CustomerOption = { id: string; name: string; phone: string }
type Line = { productId: string; quantity: number; customization: string }

// Sirve para órdenes y cotizaciones: la cotización no lleva entrega ni anticipo, sino una fecha de vencimiento.
export function OrderForm({
  products,
  customers,
  mode = "order",
}: {
  products: ProductOption[]
  customers: CustomerOption[]
  mode?: "order" | "quote"
}) {
  const isQuote = mode === "quote"
  const [customerId, setCustomerId] = useState<string>()
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [lines, setLines] = useState<Line[]>([])
  const [query, setQuery] = useState("")
  const [discount, setDiscount] = useState(0)
  const [deposit, setDeposit] = useState(0)
  const [saved, setSaved] = useState(false)

  const byId = new Map(products.map((p) => [p.id, p]))
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * byId.get(l.productId)!.price, 0)
  const total = Math.max(subtotal - discount, 0)
  const visible = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  function add(productId: string) {
    setLines((prev) =>
      prev.some((l) => l.productId === productId)
        ? prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { productId, quantity: 1, customization: "" }]
    )
  }

  function update(productId: string, change: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...change } : l)).filter((l) => l.quantity > 0))
  }

  if (saved) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <CircleCheck className="size-12 text-emerald-600" />
          <h2 className="font-heading text-2xl font-semibold">{isQuote ? "Cotización COT-0008 creada" : "Orden ORD-0019 creada"}</h2>
          <p className="text-muted-foreground">
            Total {formatMoney(total)}
            {deposit > 0 && ` · anticipo de ${formatMoney(deposit)} registrado`}
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="h-11" onClick={() => location.reload()}>
              Crear otra
            </Button>
            <Button className="h-11" asChild>
              <Link href={isQuote ? "/cotizaciones/q7" : "/ordenes"}>{isQuote ? "Ver cotización" : "Ver órdenes"}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isQuote ? "Cliente" : "Cliente y entrega"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Elige un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isQuote ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="valida">Válida hasta</Label>
                  <Input id="valida" type="date" className="h-11" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="evento">Para qué es (opcional)</Label>
                  <Input id="evento" className="h-11" placeholder="Ej. boda, cumpleaños" />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fecha">Fecha de entrega</Label>
                  <Input id="fecha" type="date" className="h-11" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="hora">Hora</Label>
                  <Input id="hora" type="time" className="h-11" defaultValue="15:00" />
                </div>
              </>
            )}
            <div className={cn("flex flex-col gap-2 sm:col-span-2", isQuote && "hidden")}>
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
            {!isQuote && deliveryType === "delivery" && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" className="h-11" placeholder="Calle, número, sector" />
              </div>
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
              <Input
                className="h-11 pl-9"
                placeholder="Buscar producto"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p.id)}
                  className="flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-sm leading-tight font-medium">{p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatMoney(p.price)} / {p.unit}
                  </span>
                  {p.stock !== null && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">{p.stock} hechos</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="text-lg">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {lines.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Toca un producto para agregarlo
            </p>
          )}
          {lines.map((l) => {
            const p = byId.get(l.productId)!
            return (
              <div key={l.productId} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {p.emoji} {p.name}
                  </span>
                  <span className="text-sm tabular-nums">{formatMoney(l.quantity * p.price)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border">
                    <Button variant="ghost" size="icon" className="size-9" onClick={() => update(l.productId, { quantity: l.quantity - 1 })} aria-label="Quitar uno">
                      <Minus />
                    </Button>
                    <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                    <Button variant="ghost" size="icon" className="size-9" onClick={() => update(l.productId, { quantity: l.quantity + 1 })} aria-label="Agregar uno">
                      <Plus />
                    </Button>
                  </div>
                  <Input
                    className="h-9 flex-1 text-sm"
                    placeholder="Personalización"
                    value={l.customization}
                    onChange={(e) => update(l.productId, { customization: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" onClick={() => update(l.productId, { quantity: 0 })} aria-label="Eliminar">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )
          })}

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descuento" className="text-xs">Descuento (RD$)</Label>
              <Input id="descuento" type="number" min={0} inputMode="numeric" className="h-10" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            {!isQuote && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="anticipo" className="text-xs">Anticipo (RD$)</Label>
                <Input id="anticipo" type="number" min={0} inputMode="numeric" className="h-10" value={deposit || ""} onChange={(e) => setDeposit(Number(e.target.value))} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notas" className="text-xs">Notas</Label>
            <Textarea id="notas" placeholder={isQuote ? "Detalles para el cliente: sabores, decoración…" : "Alergias, instrucciones de entrega…"} />
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
            <div className="flex justify-between pt-1 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(total)}</dd>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Queda por cobrar</dt>
                <dd className="tabular-nums">{formatMoney(Math.max(total - deposit, 0))}</dd>
              </div>
            )}
          </dl>

          <Button size="lg" className="h-12 text-base" disabled={!customerId || lines.length === 0} onClick={() => setSaved(true)}>
            {isQuote ? "Guardar cotización" : "Guardar orden"}
          </Button>
          {(!customerId || lines.length === 0) && (
            <p className="-mt-2 text-center text-xs text-muted-foreground">Elige un cliente y al menos un producto</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
