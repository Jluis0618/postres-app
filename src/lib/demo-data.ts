// Datos de ejemplo para ver las pantallas antes de conectar Supabase.
// Los nombres de campos son los mismos de la base de datos (docs/modelo-datos.md),
// así que reemplazar esto por consultas reales cambia poco en las pantallas.

export type SupplyUnit = "g" | "ml" | "unit"
export type OrderStatus =
  | "pending_confirmation"
  | "pending"
  | "in_preparation"
  | "ready"
  | "delivered"
  | "cancelled"
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired"
export type PaymentStatus = "unpaid" | "partial" | "paid"
export type PaymentMethod = "cash" | "transfer" | "card" | "other"

export type Category = { id: string; name: string }

export type Product = {
  id: string
  category_id: string
  name: string
  price: number
  unit: string
  track_stock: boolean
  stock_available: number
  unit_cost: number
  emoji: string
}

export type Supply = {
  id: string
  name: string
  unit: SupplyUnit
  stock_on_hand: number
  min_stock: number
  unit_cost: number
  supplier: string
}

export type Customer = {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
}

export type OrderItem = {
  product_id: string
  description: string
  quantity: number
  unit_price: number
  customization?: string
}

export type Payment = {
  amount: number
  method: PaymentMethod
  paid_at: string
}

export type Order = {
  id: string
  number: string
  customer_id: string
  delivery_at: string
  delivery_type: "pickup" | "delivery"
  delivery_address?: string
  status: OrderStatus
  source: "manual" | "commissions"
  external_ref?: string
  discount: number
  notes?: string
  items: OrderItem[]
  payments: Payment[]
}

export type Quote = {
  id: string
  number: string
  customer_id: string
  issued_on: string
  valid_until: string
  status: QuoteStatus
  items: OrderItem[]
  discount: number
}

export type Invoice = {
  id: string
  number: string
  order_id: string
  customer_id: string
  issued_on: string
  total: number
  paid: number
  payment_status: PaymentStatus
}

// Fechas relativas a hoy, para que la demo siempre se vea "al día".
function at(daysFromToday: number, hour = 9, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function dateOnly(daysFromToday: number) {
  return at(daysFromToday).slice(0, 10)
}

export const settings = {
  business_name: "Dulces de Mamá",
  phone: "809-555-0100",
  address: "Calle Las Flores #24, Santo Domingo",
  tax_id: "131-00000-0",
  itbis_enabled: false,
  itbis_rate: 18,
  quote_validity_days: 15,
  quote_note: "Precios válidos hasta la fecha indicada. Se requiere 50% de anticipo para confirmar el pedido.",
  invoice_note: "¡Gracias por preferirnos! Transferencias: Banco Popular, cuenta 123-456789-0.",
}

export const categories: Category[] = [
  { id: "c1", name: "Tortas" },
  { id: "c2", name: "Postres fríos" },
  { id: "c3", name: "Galletas y brownies" },
  { id: "c4", name: "Artículos" },
]

export const products: Product[] = [
  { id: "p1", category_id: "c1", name: "Torta de chocolate", price: 2500, unit: "unidad", track_stock: false, stock_available: 0, unit_cost: 780, emoji: "🎂" },
  { id: "p2", category_id: "c1", name: "Tres leches", price: 2200, unit: "unidad", track_stock: false, stock_available: 0, unit_cost: 690, emoji: "🍰" },
  { id: "p3", category_id: "c1", name: "Torta de vainilla con fresas", price: 2600, unit: "unidad", track_stock: false, stock_available: 0, unit_cost: 850, emoji: "🍓" },
  { id: "p4", category_id: "c2", name: "Cheesecake de fresa", price: 2800, unit: "unidad", track_stock: false, stock_available: 0, unit_cost: 1120, emoji: "🧁" },
  { id: "p5", category_id: "c2", name: "Flan de caramelo", price: 1200, unit: "unidad", track_stock: true, stock_available: 2, unit_cost: 310, emoji: "🍮" },
  { id: "p6", category_id: "c3", name: "Galletas de chispas", price: 450, unit: "docena", track_stock: true, stock_available: 3, unit_cost: 140, emoji: "🍪" },
  { id: "p7", category_id: "c3", name: "Brownies", price: 600, unit: "caja de 6", track_stock: true, stock_available: 1, unit_cost: 210, emoji: "🍫" },
  { id: "p8", category_id: "c4", name: "Vela de cumpleaños", price: 50, unit: "unidad", track_stock: true, stock_available: 40, unit_cost: 15, emoji: "🕯️" },
  { id: "p9", category_id: "c4", name: "Topper personalizado", price: 350, unit: "unidad", track_stock: false, stock_available: 0, unit_cost: 120, emoji: "✨" },
]

export const supplies: Supply[] = [
  { id: "s1", name: "Harina", unit: "g", stock_on_hand: 2400, min_stock: 2000, unit_cost: 0.045, supplier: "Supermercado Nacional" },
  { id: "s2", name: "Azúcar", unit: "g", stock_on_hand: 800, min_stock: 1500, unit_cost: 0.06, supplier: "Supermercado Nacional" },
  { id: "s3", name: "Mantequilla", unit: "g", stock_on_hand: 1500, min_stock: 500, unit_cost: 0.38, supplier: "Distribuidora Lácteos" },
  { id: "s4", name: "Huevos", unit: "unit", stock_on_hand: 14, min_stock: 30, unit_cost: 8.5, supplier: "Granja El Prado" },
  { id: "s5", name: "Cacao en polvo", unit: "g", stock_on_hand: 350, min_stock: 250, unit_cost: 0.9, supplier: "Supermercado Nacional" },
  { id: "s6", name: "Queso crema", unit: "g", stock_on_hand: 450, min_stock: 900, unit_cost: 0.42, supplier: "Distribuidora Lácteos" },
  { id: "s7", name: "Leche", unit: "ml", stock_on_hand: 3000, min_stock: 2000, unit_cost: 0.07, supplier: "Distribuidora Lácteos" },
  { id: "s8", name: "Leche condensada", unit: "ml", stock_on_hand: 790, min_stock: 790, unit_cost: 0.19, supplier: "Supermercado Nacional" },
  { id: "s9", name: "Vainilla", unit: "ml", stock_on_hand: 120, min_stock: 50, unit_cost: 1.1, supplier: "Supermercado Nacional" },
  { id: "s10", name: "Fresas", unit: "g", stock_on_hand: 600, min_stock: 500, unit_cost: 0.25, supplier: "Mercado" },
  { id: "s11", name: "Cajas para torta", unit: "unit", stock_on_hand: 4, min_stock: 10, unit_cost: 35, supplier: "Empaques RD" },
  { id: "s12", name: "Cajas para galletas", unit: "unit", stock_on_hand: 25, min_stock: 10, unit_cost: 18, supplier: "Empaques RD" },
]

export const customers: Customer[] = [
  { id: "u1", name: "Ana Pérez", phone: "809-555-0142", email: "ana@correo.com", address: "Naco, Santo Domingo" },
  { id: "u2", name: "Carlos Méndez", phone: "829-555-0198", address: "Piantini, Santo Domingo" },
  { id: "u3", name: "Laura Gómez", phone: "849-555-0107" },
  { id: "u4", name: "Oficina Grupo Caribe", phone: "809-555-0300", email: "compras@grupocaribe.do", address: "Av. Winston Churchill" },
  { id: "u5", name: "María Rodríguez", phone: "809-555-0177", address: "Bella Vista" },
  { id: "u6", name: "Pedro Santos", phone: "829-555-0123" },
]

export const orders: Order[] = [
  {
    id: "o12", number: "ORD-0012", customer_id: "u1", delivery_at: at(0, 15), delivery_type: "pickup",
    status: "ready", source: "manual", discount: 0,
    items: [
      { product_id: "p1", description: "Torta de chocolate", quantity: 1, unit_price: 2500, customization: "\"Feliz cumple Sofía\" en letras rosadas" },
      { product_id: "p8", description: "Vela de cumpleaños", quantity: 6, unit_price: 50 },
    ],
    payments: [{ amount: 1000, method: "transfer", paid_at: at(-3, 11) }],
  },
  {
    id: "o13", number: "ORD-0013", customer_id: "u4", delivery_at: at(0, 17, 30), delivery_type: "delivery",
    delivery_address: "Av. Winston Churchill, Torre Empresarial, piso 8",
    status: "in_preparation", source: "commissions", external_ref: "COM-2041", discount: 300,
    notes: "Para reunión de equipo. Llamar a recepción al llegar.",
    items: [
      { product_id: "p6", description: "Galletas de chispas", quantity: 4, unit_price: 450 },
      { product_id: "p7", description: "Brownies", quantity: 3, unit_price: 600 },
    ],
    payments: [],
  },
  {
    id: "o14", number: "ORD-0014", customer_id: "u2", delivery_at: at(1, 10), delivery_type: "pickup",
    status: "pending", source: "manual", discount: 0,
    items: [{ product_id: "p4", description: "Cheesecake de fresa", quantity: 1, unit_price: 2800 }],
    payments: [{ amount: 1400, method: "cash", paid_at: at(-1, 16) }],
  },
  {
    id: "o15", number: "ORD-0015", customer_id: "u5", delivery_at: at(1, 16), delivery_type: "delivery",
    delivery_address: "Bella Vista, calle 5 #12",
    status: "pending", source: "manual", discount: 0,
    items: [
      { product_id: "p2", description: "Tres leches", quantity: 2, unit_price: 2200, customization: "Una con merengue y otra con crema" },
      { product_id: "p9", description: "Topper personalizado", quantity: 1, unit_price: 350, customization: "\"Felicidades Mamá\"" },
    ],
    payments: [],
  },
  {
    id: "o16", number: "ORD-0016", customer_id: "u4", delivery_at: at(2, 9), delivery_type: "delivery",
    delivery_address: "Av. Winston Churchill, Torre Empresarial, piso 8",
    status: "pending_confirmation", source: "commissions", external_ref: "COM-2057", discount: 0,
    items: [{ product_id: "p3", description: "Torta de vainilla con fresas", quantity: 1, unit_price: 2600, customization: "\"Bienvenida Laura\"" }],
    payments: [],
  },
  {
    id: "o17", number: "ORD-0017", customer_id: "u3", delivery_at: at(3, 14), delivery_type: "pickup",
    status: "pending_confirmation", source: "commissions", external_ref: "COM-2060", discount: 0,
    items: [{ product_id: "p5", description: "Flan de caramelo", quantity: 2, unit_price: 1200 }],
    payments: [],
  },
  {
    id: "o18", number: "ORD-0018", customer_id: "u6", delivery_at: at(4, 11), delivery_type: "pickup",
    status: "pending", source: "manual", discount: 200,
    items: [
      { product_id: "p1", description: "Torta de chocolate", quantity: 1, unit_price: 2500 },
      { product_id: "p6", description: "Galletas de chispas", quantity: 2, unit_price: 450 },
    ],
    payments: [],
  },
  {
    id: "o11", number: "ORD-0011", customer_id: "u5", delivery_at: at(-1, 12), delivery_type: "pickup",
    status: "delivered", source: "manual", discount: 0,
    items: [{ product_id: "p4", description: "Cheesecake de fresa", quantity: 1, unit_price: 2800 }],
    payments: [{ amount: 2800, method: "cash", paid_at: at(-1, 12) }],
  },
  {
    id: "o10", number: "ORD-0010", customer_id: "u4", delivery_at: at(-2, 9), delivery_type: "delivery",
    delivery_address: "Av. Winston Churchill, Torre Empresarial, piso 8",
    status: "delivered", source: "commissions", external_ref: "COM-2033", discount: 0,
    items: [{ product_id: "p7", description: "Brownies", quantity: 5, unit_price: 600 }],
    payments: [],
  },
  {
    id: "o09", number: "ORD-0009", customer_id: "u2", delivery_at: at(-4, 18), delivery_type: "pickup",
    status: "cancelled", source: "manual", discount: 0,
    items: [{ product_id: "p2", description: "Tres leches", quantity: 1, unit_price: 2200 }],
    payments: [],
  },
  {
    id: "o08", number: "ORD-0008", customer_id: "u1", delivery_at: at(-5, 16), delivery_type: "pickup",
    status: "delivered", source: "manual", discount: 0,
    items: [
      { product_id: "p1", description: "Torta de chocolate", quantity: 1, unit_price: 2500 },
      { product_id: "p2", description: "Tres leches", quantity: 1, unit_price: 2200 },
      { product_id: "p8", description: "Vela de cumpleaños", quantity: 5, unit_price: 50 },
    ],
    payments: [{ amount: 2500, method: "transfer", paid_at: at(-7, 10) }],
  },
  {
    id: "o07", number: "ORD-0007", customer_id: "u3", delivery_at: at(-8, 11), delivery_type: "pickup",
    status: "delivered", source: "commissions", external_ref: "COM-2019", discount: 0,
    items: [{ product_id: "p2", description: "Tres leches", quantity: 1, unit_price: 2200 }],
    payments: [{ amount: 2200, method: "cash", paid_at: at(-8, 11) }],
  },
  {
    id: "o06", number: "ORD-0006", customer_id: "u4", delivery_at: at(-11, 9), delivery_type: "delivery",
    delivery_address: "Av. Winston Churchill, Torre Empresarial, piso 8",
    status: "delivered", source: "commissions", external_ref: "COM-2004", discount: 0,
    items: [
      { product_id: "p4", description: "Cheesecake de fresa", quantity: 2, unit_price: 2800 },
      { product_id: "p7", description: "Brownies", quantity: 1, unit_price: 600 },
      { product_id: "p8", description: "Vela de cumpleaños", quantity: 2, unit_price: 50 },
    ],
    payments: [{ amount: 6300, method: "transfer", paid_at: at(-10, 15) }],
  },
]

export const quotes: Quote[] = [
  {
    id: "q7", number: "COT-0007", customer_id: "u4", issued_on: dateOnly(0), valid_until: dateOnly(15), status: "draft", discount: 500,
    items: [
      { product_id: "p6", description: "Galletas de chispas", quantity: 10, unit_price: 450 },
      { product_id: "p7", description: "Brownies", quantity: 8, unit_price: 600 },
    ],
  },
  {
    id: "q6", number: "COT-0006", customer_id: "u3", issued_on: dateOnly(-2), valid_until: dateOnly(13), status: "sent", discount: 0,
    items: [
      { product_id: "p3", description: "Torta de vainilla con fresas", quantity: 1, unit_price: 2600, customization: "Dos pisos, boda civil" },
      { product_id: "p9", description: "Topper personalizado", quantity: 1, unit_price: 350 },
    ],
  },
  {
    id: "q5", number: "COT-0005", customer_id: "u2", issued_on: dateOnly(-6), valid_until: dateOnly(9), status: "accepted", discount: 0,
    items: [{ product_id: "p4", description: "Cheesecake de fresa", quantity: 1, unit_price: 2800 }],
  },
  {
    id: "q4", number: "COT-0004", customer_id: "u6", issued_on: dateOnly(-25), valid_until: dateOnly(-10), status: "expired", discount: 0,
    items: [{ product_id: "p1", description: "Torta de chocolate", quantity: 3, unit_price: 2500 }],
  },
]

export const invoices: Invoice[] = [
  { id: "f8", number: "FAC-0008", order_id: "o11", customer_id: "u5", issued_on: dateOnly(-1), total: 2800, paid: 2800, payment_status: "paid" },
  { id: "f7", number: "FAC-0007", order_id: "o10", customer_id: "u4", issued_on: dateOnly(-2), total: 3000, paid: 0, payment_status: "unpaid" },
  { id: "f6", number: "FAC-0006", order_id: "o08", customer_id: "u1", issued_on: dateOnly(-5), total: 4950, paid: 2500, payment_status: "partial" },
  { id: "f5", number: "FAC-0005", order_id: "o07", customer_id: "u3", issued_on: dateOnly(-8), total: 2200, paid: 2200, payment_status: "paid" },
  { id: "f4", number: "FAC-0004", order_id: "o06", customer_id: "u4", issued_on: dateOnly(-11), total: 6300, paid: 6300, payment_status: "paid" },
]

// Ventas de los últimos 14 días (RD$), del más viejo a hoy.
export const salesLast14Days: { date: string; total: number }[] = [
  3200, 0, 5400, 2800, 4100, 7600, 2200, 0, 6300, 3900, 4950, 2600, 3000, 2800,
].map((total, i) => ({ date: dateOnly(i - 13), total }))

// ---------------------------------------------------------------------------
// Consultas de ayuda (las mismas que luego hará Supabase)
// ---------------------------------------------------------------------------

export function getCustomer(id: string) {
  return customers.find((c) => c.id === id)!
}

export function getProduct(id: string) {
  return products.find((p) => p.id === id)!
}

export function getOrder(id: string) {
  return orders.find((o) => o.id === id)
}

export function orderTotals(o: { items: OrderItem[]; discount: number }) {
  const subtotal = o.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const base = Math.max(subtotal - o.discount, 0)
  const tax = settings.itbis_enabled ? Math.round(base * settings.itbis_rate) / 100 : 0
  return { subtotal, discount: o.discount, tax, total: base + tax }
}

export function orderPaid(o: Order) {
  return o.payments.reduce((sum, p) => sum + p.amount, 0)
}

export function invoiceForOrder(orderId: string) {
  return invoices.find((i) => i.order_id === orderId)
}

export function lowStockSupplies() {
  return supplies.filter((s) => s.stock_on_hand < s.min_stock)
}

// Lo que piden las órdenes pendientes de los próximos 7 días (simulado),
// más el mínimo, menos lo que hay = qué comprar.
const requiredNext7Days: Record<string, number> = {
  s1: 2100, s2: 1300, s3: 900, s4: 22, s5: 150, s6: 600, s7: 1500, s8: 790, s10: 450, s11: 5,
}

// ---------------------------------------------------------------------------
// Recetas, historial, usuarios, integración y reportes
// ---------------------------------------------------------------------------

export type Recipe = { product_id: string; recipe_yield: number; items: { supply_id: string; quantity: number }[] }

export const recipes: Recipe[] = [
  { product_id: "p1", recipe_yield: 1, items: [
    { supply_id: "s1", quantity: 500 }, { supply_id: "s2", quantity: 300 }, { supply_id: "s3", quantity: 200 },
    { supply_id: "s4", quantity: 4 }, { supply_id: "s5", quantity: 120 }, { supply_id: "s7", quantity: 250 },
    { supply_id: "s11", quantity: 1 },
  ] },
  { product_id: "p2", recipe_yield: 1, items: [
    { supply_id: "s1", quantity: 300 }, { supply_id: "s2", quantity: 250 }, { supply_id: "s4", quantity: 6 },
    { supply_id: "s7", quantity: 500 }, { supply_id: "s8", quantity: 395 }, { supply_id: "s11", quantity: 1 },
  ] },
  { product_id: "p4", recipe_yield: 1, items: [
    { supply_id: "s6", quantity: 680 }, { supply_id: "s2", quantity: 200 }, { supply_id: "s4", quantity: 4 },
    { supply_id: "s10", quantity: 300 }, { supply_id: "s3", quantity: 100 }, { supply_id: "s11", quantity: 1 },
  ] },
  { product_id: "p6", recipe_yield: 2, items: [
    { supply_id: "s1", quantity: 300 }, { supply_id: "s3", quantity: 150 }, { supply_id: "s2", quantity: 180 },
    { supply_id: "s4", quantity: 1 }, { supply_id: "s12", quantity: 2 },
  ] },
]

export function getRecipe(productId: string) {
  return recipes.find((r) => r.product_id === productId)
}

export function getSupply(id: string) {
  return supplies.find((s) => s.id === id)!
}

export type MovementType = "purchase" | "order_consumption" | "order_return" | "production" | "adjustment" | "waste"

export type Movement = { id: string; type: MovementType; quantity: number; created_at: string; note: string }

// Historial de ejemplo de un insumo, armado para que cuadre con su stock actual.
export function supplyMovements(supplyId: string): Movement[] {
  const s = getSupply(supplyId)
  const unit = s.unit === "unit" ? 1 : 100
  const purchase = Math.round((s.min_stock * 1.5) / unit) * unit || unit * 10
  const used1 = Math.round((purchase * 0.25) / unit) * unit
  const used2 = Math.round((purchase * 0.15) / unit) * unit
  const waste = s.unit === "unit" ? 1 : unit
  const initial = s.stock_on_hand - purchase + used1 + used2 + waste
  return [
    { id: "m5", type: "order_consumption", quantity: -used2, created_at: at(0, 8, 15), note: "ORD-0013" },
    { id: "m4", type: "waste", quantity: -waste, created_at: at(-2, 17), note: "Se dañó en la nevera" },
    { id: "m3", type: "order_consumption", quantity: -used1, created_at: at(-3, 9), note: "ORD-0011" },
    { id: "m2", type: "purchase", quantity: purchase, created_at: at(-6, 11), note: s.supplier },
    { id: "m1", type: "adjustment", quantity: Math.max(initial, 0), created_at: at(-20, 10), note: "Stock inicial" },
  ]
}

export const users = [
  { id: "a1", name: "Mamá", email: "mama@dulcesdemama.do", role: "admin" as const, last_seen: "Ahora" },
  { id: "a2", name: "Yokasta", email: "yokasta@correo.com", role: "assistant" as const, last_seen: "Ayer" },
  { id: "a3", name: "carlos.r@correo.com", email: "carlos.r@correo.com", role: null, last_seen: "Nunca" },
]

export const webhookDeliveries = [
  { id: "w4", event: "invoice.paid", order_number: "ORD-0006", external_ref: "COM-2004", status: "sent" as const, attempts: 1, created_at: at(-10, 15) },
  { id: "w3", event: "invoice.paid", order_number: "ORD-0007", external_ref: "COM-2019", status: "sent" as const, attempts: 2, created_at: at(-8, 11) },
  { id: "w2", event: "invoice.paid", order_number: "ORD-0004", external_ref: "COM-1988", status: "failed" as const, attempts: 5, created_at: at(-16, 12) },
]

export const salesByMonth = [
  { month: "May", total: 38400 }, { month: "Jun", total: 45200 }, { month: "Jul", total: 41800 },
  { month: "Ago", total: 52600 }, { month: "Sep", total: 49900 }, { month: "Oct", total: 48850 },
]

export const topProducts = [
  { product_id: "p1", units: 18, total: 45000 },
  { product_id: "p4", units: 12, total: 33600 },
  { product_id: "p2", units: 11, total: 24200 },
  { product_id: "p6", units: 34, total: 15300 },
  { product_id: "p7", units: 21, total: 12600 },
]

export function shoppingList() {
  return supplies
    .map((s) => {
      const required = requiredNext7Days[s.id] ?? 0
      return { ...s, required, to_buy: Math.max(required + s.min_stock - s.stock_on_hand, 0) }
    })
    .filter((s) => s.to_buy > 0)
}
