// Tipos de las filas de la base de datos (ver supabase/migrations y docs/modelo-datos.md).

export type UserRole = "admin" | "assistant"
export type SupplyUnit = "g" | "ml" | "unit"
export type OrderStatus = "pending_confirmation" | "pending" | "in_preparation" | "ready" | "delivered" | "cancelled"
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired"
export type PaymentStatus = "unpaid" | "partial" | "paid"
export type PaymentMethod = "cash" | "transfer" | "card" | "other"
export type DeliveryType = "pickup" | "delivery"
// Movimientos de insumos y de productos hechos ("order_sale" solo existe en productos).
export type MovementType = "purchase" | "order_consumption" | "order_return" | "production" | "adjustment" | "waste" | "order_sale"

export type Settings = {
  business_name: string
  phone: string | null
  address: string | null
  tax_id: string | null
  logo_url: string | null
  itbis_enabled: boolean
  itbis_rate: number
  invoice_note: string | null
  quote_note: string | null
  quote_validity_days: number
}

export type Profile = { id: string; name: string | null; email: string | null; role: UserRole | null; created_at: string }

export type Category = { id: string; name: string; sort_order: number }

export type Product = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  unit: string
  emoji: string
  track_stock: boolean
  stock_available: number
  recipe_yield: number
  is_active: boolean
}

export type Supply = {
  id: string
  name: string
  unit: SupplyUnit
  stock_on_hand: number
  min_stock: number
  unit_cost: number
  supplier: string | null
  notes: string | null
  is_active: boolean
}

export type RecipeItem = { supply_id: string; quantity: number }

export type Movement = {
  id: string
  type: MovementType
  quantity: number
  created_at: string
  notes: string | null
  order: { number: string } | null
}

export type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  tax_id: string | null
  notes: string | null
}

export type LineItem = {
  id: string
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  total: number
  customization: string | null
  created_at?: string
}

export type Payment = { id: string; amount: number; method: PaymentMethod; paid_at: string; reference: string | null }

export type InvoiceSummary = { id: string; number: string; status: "issued" | "void"; payment_status: PaymentStatus; total: number }

export type Order = {
  id: string
  number: string
  customer_id: string
  quote_id: string | null
  delivery_at: string
  delivery_type: DeliveryType
  delivery_address: string | null
  status: OrderStatus
  source: "manual" | "commissions"
  external_ref: string | null
  subtotal: number
  discount: number
  tax: number
  total: number
  notes: string | null
  supplies_consumed_at: string | null
  customer: Customer
  items: LineItem[]
  payments: Payment[]
  invoices: InvoiceSummary[]
}

export type Quote = {
  id: string
  number: string
  customer_id: string
  issued_on: string
  valid_until: string
  status: QuoteStatus
  subtotal: number
  discount: number
  tax: number
  total: number
  notes: string | null
  order_id: string | null
  customer: Customer
  items: LineItem[]
  order: { number: string } | null
}

export type Invoice = {
  id: string
  number: string
  order_id: string
  customer_id: string
  issued_on: string
  subtotal: number
  discount: number
  tax: number
  total: number
  status: "issued" | "void"
  payment_status: PaymentStatus
  customer: Customer
}

/** Lo que falta para preparar una orden o producir (respuesta de las funciones de la base). */
export type Missing = { supply_id: string; name: string; unit: SupplyUnit; required: number; available: number; missing: number }

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }
