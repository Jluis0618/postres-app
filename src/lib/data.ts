import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { addDays, dayKey, localToIso } from "@/lib/format"
import type {
  Category,
  Customer,
  Invoice,
  Movement,
  Order,
  OrderStatus,
  Product,
  Profile,
  Quote,
  RecipeItem,
  Settings,
  Supply,
} from "@/lib/types"

// Consultas de lectura. Corren en el servidor con la sesión del usuario,
// así que la base de datos aplica los permisos (RLS) en cada una.

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

export const ORDER_SELECT =
  "*, customer:customers(*), items:order_items(*), payments(*), invoices(id, number, status, payment_status, total)"
const QUOTE_SELECT = "*, customer:customers(*), items:quote_items(*), order:orders!quotes_order_id_fkey(number)"

function sortItems<T extends { items: { created_at?: string }[] }>(rows: T[]): T[] {
  for (const r of rows) r.items.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
  return rows
}

// Una cotización abierta cuya fecha ya pasó se muestra como vencida.
function markExpired(quotes: Quote[]) {
  const today = dayKey(new Date())
  for (const q of quotes) {
    if ((q.status === "draft" || q.status === "sent") && !q.order_id && q.valid_until < today) q.status = "expired"
  }
  return quotes
}

// ---------------------------------------------------------------------------
// Configuración y usuarios
// ---------------------------------------------------------------------------

export const getSettings = cache(async () => {
  const supabase = await createClient()
  return check(await supabase.from("settings").select("*").eq("id", 1).single<Settings>())
})

export async function listProfiles() {
  const supabase = await createClient()
  return check(await supabase.from("profiles").select("*").order("created_at")) as Profile[]
}

export async function listWebhookDeliveries() {
  const supabase = await createClient()
  return check(
    await supabase
      .from("webhook_deliveries")
      .select("id, status, attempts, last_error, created_at, sent_at, order:orders(id, number, external_ref)")
      .order("created_at", { ascending: false })
      .limit(10)
  ) as unknown as {
    id: string
    status: "pending" | "sent" | "failed"
    attempts: number
    last_error: string | null
    created_at: string
    sent_at: string | null
    order: { id: string; number: string; external_ref: string | null }
  }[]
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export async function listSupplies() {
  const supabase = await createClient()
  return check(await supabase.from("supplies").select("*").order("name")) as Supply[]
}

export async function listSupplyMovements(supplyId: string) {
  const supabase = await createClient()
  return check(
    await supabase
      .from("supply_movements")
      .select("id, type, quantity, created_at, notes, order:orders(number)")
      .eq("supply_id", supplyId)
      .order("created_at", { ascending: false })
      .limit(40)
  ) as unknown as Movement[]
}

export async function listCategories() {
  const supabase = await createClient()
  return check(await supabase.from("categories").select("*").order("sort_order").order("name")) as Category[]
}

export type ProductWithCost = Product & { unit_cost: number }

export async function listProducts() {
  const supabase = await createClient()
  const [products, costs] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase.from("product_costs").select("product_id, unit_cost"),
  ])
  const costById = new Map((check(costs) as { product_id: string; unit_cost: number }[]).map((c) => [c.product_id, c.unit_cost]))
  return (check(products) as Product[]).map((p) => ({ ...p, unit_cost: costById.get(p.id) ?? 0 }))
}

export async function getProduct(id: string) {
  const supabase = await createClient()
  const [product, recipe] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle<Product>(),
    supabase.from("recipe_items").select("supply_id, quantity").eq("product_id", id),
  ])
  const p = check(product)
  return p ? { product: p, recipe: check(recipe) as RecipeItem[] } : null
}

export async function listProductMovements(productId: string) {
  const supabase = await createClient()
  return check(
    await supabase
      .from("product_movements")
      .select("id, type, quantity, created_at, notes, order:orders(number)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(40)
  ) as unknown as Movement[]
}

export type ProductStockRow = Product & { reserved: number }

/**
 * Productos con su stock hecho y lo que ya está pedido en órdenes que todavía no se preparan
 * (por confirmar o pendientes). Lo pedido se descuenta del stock cuando la orden pasa a preparación.
 */
export async function listProductStock() {
  const supabase = await createClient()
  const [products, open] = await Promise.all([
    supabase.from("products").select("*").eq("is_active", true).order("name"),
    supabase.from("order_items").select("product_id, quantity, order:orders!inner(status)").in("order.status", ["pending_confirmation", "pending"]),
  ])
  const reserved = new Map<string, number>()
  for (const i of check(open) as unknown as { product_id: string | null; quantity: number }[]) {
    if (i.product_id) reserved.set(i.product_id, (reserved.get(i.product_id) ?? 0) + Number(i.quantity))
  }
  return (check(products) as Product[]).map((p) => ({ ...p, reserved: reserved.get(p.id) ?? 0 }))
}

export async function listRecipeItems() {
  const supabase = await createClient()
  return check(await supabase.from("recipe_items").select("product_id, supply_id, quantity")) as (RecipeItem & { product_id: string })[]
}

export async function getShoppingList(days = 7) {
  const supabase = await createClient()
  const [list, supplies] = await Promise.all([
    supabase.rpc("shopping_list", { p_days: days }),
    supabase.from("supplies").select("id, supplier, unit_cost"),
  ])
  const byId = new Map((check(supplies) as { id: string; supplier: string | null; unit_cost: number }[]).map((s) => [s.id, s]))
  return (
    check(list) as {
      supply_id: string
      name: string
      unit: Supply["unit"]
      required: number
      stock_on_hand: number
      min_stock: number
      to_buy: number
    }[]
  ).map((r) => ({ ...r, supplier: byId.get(r.supply_id)?.supplier ?? null, unit_cost: byId.get(r.supply_id)?.unit_cost ?? 0 }))
}

export async function listLowStock() {
  const supabase = await createClient()
  return check(await supabase.from("low_stock_supplies").select("*").order("name")) as {
    supply_id: string
    name: string
    unit: Supply["unit"]
    stock_on_hand: number
    min_stock: number
  }[]
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function listCustomers() {
  const supabase = await createClient()
  const [customers, orders] = await Promise.all([
    supabase.from("customers").select("*").eq("is_active", true).order("name"),
    supabase.from("orders").select("customer_id, total").neq("status", "cancelled"),
  ])
  const stats = new Map<string, { count: number; total: number }>()
  for (const o of check(orders) as { customer_id: string; total: number }[]) {
    const s = stats.get(o.customer_id) ?? { count: 0, total: 0 }
    stats.set(o.customer_id, { count: s.count + 1, total: s.total + Number(o.total) })
  }
  return (check(customers) as Customer[]).map((c) => ({ ...c, orders: stats.get(c.id)?.count ?? 0, spent: stats.get(c.id)?.total ?? 0 }))
}

export async function getCustomer(id: string) {
  const supabase = await createClient()
  const [customer, orders, balances] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle<Customer>(),
    supabase.from("orders").select(ORDER_SELECT).eq("customer_id", id).order("delivery_at", { ascending: false }).limit(50),
    supabase.from("invoice_balances").select("balance").eq("customer_id", id),
  ])
  const c = check(customer)
  if (!c) return null
  return {
    customer: c,
    orders: sortItems(check(orders) as unknown as Order[]),
    owed: (check(balances) as { balance: number }[]).reduce((s, b) => s + Number(b.balance), 0),
  }
}

// ---------------------------------------------------------------------------
// Órdenes
// ---------------------------------------------------------------------------

export async function listOrders(filter: {
  statuses?: OrderStatus[]
  excludeStatuses?: OrderStatus[]
  fromDay?: string
  toDay?: string
  ascending?: boolean
  limit?: number
}) {
  const supabase = await createClient()
  let q = supabase.from("orders").select(ORDER_SELECT)
  if (filter.statuses) q = q.in("status", filter.statuses)
  if (filter.excludeStatuses) q = q.not("status", "in", `(${filter.excludeStatuses.join(",")})`)
  if (filter.fromDay) q = q.gte("delivery_at", localToIso(filter.fromDay, "00:00"))
  if (filter.toDay) q = q.lt("delivery_at", localToIso(addDays(filter.toDay, 1), "00:00"))
  q = q.order("delivery_at", { ascending: filter.ascending ?? true }).limit(filter.limit ?? 200)
  return sortItems(check(await q) as unknown as Order[])
}

export async function getOrder(id: string) {
  const supabase = await createClient()
  const [order, consumed] = await Promise.all([
    supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("supply_movements")
      .select("supply_id, quantity, supply:supplies(name, unit)")
      .eq("order_id", id)
      .eq("type", "order_consumption"),
  ])
  const o = check(order) as unknown as Order | null
  if (!o) return null
  sortItems([o])
  o.payments.sort((a, b) => a.paid_at.localeCompare(b.paid_at))
  return {
    order: o,
    consumed: (check(consumed) as unknown as { supply_id: string; quantity: number; supply: { name: string; unit: Supply["unit"] } }[]).map(
      (m) => ({ supply_id: m.supply_id, name: m.supply.name, unit: m.supply.unit, quantity: -Number(m.quantity) })
    ),
  }
}

// ---------------------------------------------------------------------------
// Cotizaciones y facturas
// ---------------------------------------------------------------------------

export async function listQuotes() {
  const supabase = await createClient()
  return markExpired(sortItems(check(await supabase.from("quotes").select(QUOTE_SELECT).order("created_at", { ascending: false }).limit(100)) as unknown as Quote[]))
}

export async function getQuote(id: string) {
  const supabase = await createClient()
  const q = check(await supabase.from("quotes").select(QUOTE_SELECT).eq("id", id).maybeSingle()) as unknown as Quote | null
  return q ? markExpired(sortItems([q]))[0] : null
}

export type InvoiceRow = Invoice & { paid: number; balance: number }

async function withPaid(invoices: Invoice[]): Promise<InvoiceRow[]> {
  if (invoices.length === 0) return []
  const supabase = await createClient()
  const payments = check(
    await supabase.from("payments").select("order_id, amount").in("order_id", [...new Set(invoices.map((i) => i.order_id))])
  ) as { order_id: string; amount: number }[]
  const paidByOrder = new Map<string, number>()
  for (const p of payments) paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount))
  return invoices.map((i) => {
    const paid = paidByOrder.get(i.order_id) ?? 0
    return { ...i, paid, balance: i.status === "void" ? 0 : Math.max(Number(i.total) - paid, 0) }
  })
}

export async function listInvoices() {
  const supabase = await createClient()
  const invoices = check(
    await supabase.from("invoices").select("*, customer:customers(*)").order("created_at", { ascending: false }).limit(200)
  ) as unknown as Invoice[]
  return withPaid(invoices)
}

export async function getInvoice(id: string) {
  const supabase = await createClient()
  const invoice = check(await supabase.from("invoices").select("*, customer:customers(*)").eq("id", id).maybeSingle()) as unknown as Invoice | null
  if (!invoice) return null
  const [row] = await withPaid([invoice])
  const order = await getOrder(invoice.order_id)
  return { invoice: row, order: order!.order }
}

// ---------------------------------------------------------------------------
// Inicio y reportes
// ---------------------------------------------------------------------------

export async function listReceivables() {
  const supabase = await createClient()
  return check(
    await supabase.from("invoice_balances").select("*").gt("balance", 0).order("issued_on")
  ) as { invoice_id: string; number: string; order_id: string; customer_id: string; issued_on: string; total: number; paid: number; balance: number; payment_status: Invoice["payment_status"] }[]
}

/** Ventas (facturas vigentes) por día desde fromDay, rellenando los días sin ventas con 0. */
export async function salesByDay(fromDay: string) {
  const supabase = await createClient()
  const rows = check(await supabase.from("sales_by_day").select("day, total").gte("day", fromDay)) as { day: string; total: number }[]
  const byDay = new Map(rows.map((r) => [r.day, Number(r.total)]))
  const today = dayKey(new Date())
  const out: { date: string; total: number }[] = []
  for (let d = fromDay; d <= today; d = addDays(d, 1)) out.push({ date: d, total: byDay.get(d) ?? 0 })
  return out
}

export async function salesByMonth(months: number) {
  const supabase = await createClient()
  const today = dayKey(new Date())
  const start = new Date(`${today.slice(0, 7)}-01T12:00:00Z`)
  start.setUTCMonth(start.getUTCMonth() - (months - 1))
  const fromDay = start.toISOString().slice(0, 10)
  const rows = check(
    await supabase.from("invoices").select("issued_on, total").eq("status", "issued").gte("issued_on", fromDay)
  ) as { issued_on: string; total: number }[]
  const out: { key: string; label: string; total: number }[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(start)
    d.setUTCMonth(start.getUTCMonth() + i)
    const key = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString("es-DO", { month: "short", timeZone: "UTC" }).replace(".", "")
    out.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), total: 0 })
  }
  for (const r of rows) {
    const m = out.find((o) => o.key === r.issued_on.slice(0, 7))
    if (m) m.total += Number(r.total)
  }
  return { months: out, fromDay }
}

export async function topProducts(fromDay: string, limit = 5) {
  const supabase = await createClient()
  const rows = check(
    await supabase.from("sales_by_product").select("product_id, name, quantity, total").gte("month", `${fromDay.slice(0, 7)}-01`)
  ) as { product_id: string | null; name: string; quantity: number; total: number }[]
  const agg = new Map<string, { name: string; units: number; total: number }>()
  for (const r of rows) {
    const key = r.product_id ?? r.name
    const a = agg.get(key) ?? { name: r.name, units: 0, total: 0 }
    agg.set(key, { name: r.name, units: a.units + Number(r.quantity), total: a.total + Number(r.total) })
  }
  return [...agg.values()].sort((a, b) => b.total - a.total).slice(0, limit)
}

export async function topCustomers(fromDay: string, limit = 5) {
  const supabase = await createClient()
  const rows = check(
    await supabase.from("sales_by_customer").select("customer_id, name, total").gte("month", `${fromDay.slice(0, 7)}-01`)
  ) as { customer_id: string; name: string; total: number }[]
  const agg = new Map<string, { id: string; name: string; total: number }>()
  for (const r of rows) {
    const a = agg.get(r.customer_id) ?? { id: r.customer_id, name: r.name, total: 0 }
    agg.set(r.customer_id, { ...a, total: a.total + Number(r.total) })
  }
  return [...agg.values()].sort((a, b) => b.total - a.total).slice(0, limit)
}

export async function averageMargin() {
  const supabase = await createClient()
  const rows = check(await supabase.from("product_costs").select("margin_pct, recipe_items")) as { margin_pct: number | null; recipe_items: number }[]
  const withRecipe = rows.filter((r) => r.recipe_items > 0 && r.margin_pct !== null)
  if (withRecipe.length === 0) return null
  return Math.round(withRecipe.reduce((s, r) => s + Number(r.margin_pct), 0) / withRecipe.length)
}
