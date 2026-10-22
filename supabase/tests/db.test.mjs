import { PGlite } from "@electric-sql/pglite"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Prueba las migraciones en un Postgres en memoria (PGlite), sin Docker ni Supabase.
// Uso: npm run test:db
const migDir = process.argv[2] ?? fileURLToPath(new URL("../migrations", import.meta.url))
const db = new PGlite()
let fails = 0
const ok = (cond, msg) => { console.log((cond ? "  ✅ " : "  ❌ ") + msg); if (!cond) fails++ }
const one = async (sql, p) => (await db.query(sql, p)).rows[0]
const val = async (sql, p) => Object.values((await db.query(sql, p)).rows[0] ?? {})[0]
const round2 = (n) => Math.round(n * 100) / 100
const err = async (sql, p) => { try { await db.query(sql, p); return null } catch (e) { return e.message } }

// --- Simula lo que Supabase ya trae: schema auth, roles y permisos por defecto ---
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`)

for (const f of fs.readdirSync(migDir).sort()) {
  try { await db.exec(fs.readFileSync(path.join(migDir, f), "utf8")); console.log("migración OK:", f) }
  catch (e) { console.log("❌ migración FALLÓ:", f, "\n", e.message); process.exit(1) }
}

const mom = await val(`insert into auth.users (email, raw_user_meta_data) values ('mama@x.com', '{"name":"Mamá"}') returning id`)
const intruder = await val(`insert into auth.users (email) values ('otro@x.com') returning id`)
console.log("\n1. Usuarios")
ok(await val(`select role from profiles where id = $1`, [mom]) === "admin", "primer usuario = admin")
ok(await val(`select role from profiles where id = $1`, [intruder]) === null, "segundo usuario sin rol")

const as = async (uid) => { await db.exec(`reset role`); await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]); await db.exec(`set role ${uid ? "authenticated" : "anon"}`) }
await as(mom)

console.log("\n2. Insumos, productos, recetas")
const harina = await val(`insert into supplies (name, unit, stock_on_hand, min_stock, unit_cost) values ('Harina','g',1000,500,0.05) returning id`)
const azucar = await val(`insert into supplies (name, unit, stock_on_hand, min_stock, unit_cost) values ('Azúcar','g',500,200,0.06) returning id`)
const huevos = await val(`insert into supplies (name, unit, stock_on_hand, unit_cost) values ('Huevos','unit',6,8) returning id`)
ok(await val(`select count(*)::int from supply_movements where notes = 'Stock inicial'`) === 3, "stock inicial queda como movimiento")
ok(Number(await val(`select stock_on_hand from supplies where id=$1`, [harina])) === 1000, "stock inicial no se duplica")
const cat = await val(`insert into categories (name) values ('Tortas') returning id`)
const torta = await val(`insert into products (category_id, name, price) values ($1,'Torta de chocolate',1500) returning id`, [cat])
const galleta = await val(`insert into products (name, price, track_stock, recipe_yield) values ('Galleta',50,true,24) returning id`)
await db.query(`insert into recipe_items (product_id, supply_id, quantity) values ($1,$2,500),($1,$3,300),($1,$4,4),($5,$2,300)`, [torta, harina, azucar, huevos, galleta])
const cost = await one(`select * from product_costs where product_id=$1`, [torta])
ok(Number(cost.unit_cost) === 25 + 18 + 32, `costo torta = ${cost.unit_cost} (75)`)
ok(Number(cost.margin) === 1425, `margen = ${cost.margin}`)
ok((await err(`update supplies set stock_on_hand = 99 where id=$1`, [harina]))?.includes("solo cambia con movimientos"), "no se puede editar stock a mano")

console.log("\n3. Compras")
const compra = await val(`insert into purchases (supplier) values ('Super') returning id`)
await db.query(`insert into purchase_items (purchase_id, supply_id, quantity, total_cost) values ($1,$2,2000,80)`, [compra, harina])
const h = await one(`select stock_on_hand, unit_cost from supplies where id=$1`, [harina])
ok(Number(h.stock_on_hand) === 3000, `harina = ${h.stock_on_hand} g`)
ok(Number(h.unit_cost) === 0.0433, `costo promedio = ${h.unit_cost} ((1000×0.05+80)/3000)`)
ok(Number(await val(`select total from purchases where id=$1`, [compra])) === 80, "total de la compra")
ok(await err(`delete from purchase_items`) === null && Number(await val(`select count(*) from purchase_items`)) === 1, "items de compra no se borran (RLS)")

console.log("\n4. Orden manual y preparación")
const cli = await val(`insert into customers (name, phone) values ('Ana','809-555-0000') returning id`)
const o1 = await val(`insert into orders (customer_id, delivery_at) values ($1, now() + interval '2 days') returning id`, [cli])
await db.query(`insert into order_items (order_id, product_id, description, quantity, unit_price) values ($1,$2,'Torta de chocolate',2,1500)`, [o1, torta])
let o = await one(`select number, subtotal, tax, total from orders where id=$1`, [o1])
ok(o.number === "ORD-0001" && Number(o.total) === 3000 && Number(o.tax) === 0, `${o.number} total ${o.total}, ITBIS ${o.tax}`)
const sl = (await db.query(`select name, to_buy from shopping_list(7)`)).rows
ok(sl.some(r => r.name === "Azúcar") && sl.some(r => r.name === "Huevos"), "lista de compras: " + sl.map(r => `${r.name} ${r.to_buy}`).join(", "))
ok((await err(`update orders set status='in_preparation' where id=$1`, [o1]))?.includes("start_order_preparation"), "no se puede pasar a preparación a mano")
let r = await val(`select start_order_preparation($1)`, [o1])
ok(r.ok === false && r.missing.map(m => m.name).join() === "Azúcar,Huevos", "faltan: " + r.missing.map(m => `${m.missing} ${m.unit} de ${m.name}`).join(", "))
ok(await val(`select status from orders where id=$1`, [o1]) === "pending", "orden sigue pendiente")
await db.query(`insert into supply_movements (supply_id, type, quantity, notes) values ($1,'adjustment',500,'conteo'),($2,'adjustment',6,'conteo')`, [azucar, huevos])
r = await val(`select start_order_preparation($1)`, [o1])
ok(r.ok === true, "preparación iniciada")
const st = (await db.query(`select name, stock_on_hand from supplies order by name`)).rows.map(x => `${x.name}=${Number(x.stock_on_hand)}`).join(" ")
ok(st === "Azúcar=400 Harina=2000 Huevos=4", "stock después: " + st)
ok((await err(`insert into order_items (order_id, description, quantity, unit_price) values ($1,'Extra',1,10)`, [o1]))?.includes("en preparación"), "no se agregan productos a orden en preparación")

console.log("\n5. Cancelar con merma")
ok((await err(`select cancel_order($1, $2)`, [o1, JSON.stringify([{ supply_id: harina, quantity: 5000 }])]))?.includes("Merma inválida"), "merma mayor a lo usado se rechaza")
await db.query(`select cancel_order($1, $2)`, [o1, JSON.stringify([{ supply_id: harina, quantity: 300 }])])
const st2 = (await db.query(`select name, stock_on_hand from supplies order by name`)).rows.map(x => `${x.name}=${Number(x.stock_on_hand)}`).join(" ")
ok(st2 === "Azúcar=1000 Harina=2700 Huevos=12", "stock tras cancelar (300 g harina de merma): " + st2)
ok(await val(`select status from orders where id=$1`, [o1]) === "cancelled", "orden cancelada")

console.log("\n6. Producción y stock de productos")
r = await val(`select register_production($1, 24)`, [galleta])
ok(r.ok && Number(await val(`select stock_available from products where id=$1`, [galleta])) === 24, "24 galletas hechas")
const o2 = await val(`insert into orders (customer_id, delivery_at) values ($1, now() + interval '1 day') returning id`, [cli])
await db.query(`insert into order_items (order_id, product_id, description, quantity, unit_price) values ($1,$2,'Galleta',20,50),($1,$2,'Galleta',10,50)`, [o2, galleta])
const harinaAntes = Number(await val(`select stock_on_hand from supplies where id=$1`, [harina]))
r = await val(`select start_order_preparation($1)`, [o2])
const usadas = (await db.query(`select qty_from_stock from order_items where order_id=$1 order by created_at, id`, [o2])).rows.map(x => Number(x.qty_from_stock))
ok(r.ok && usadas.reduce((a, b) => a + b) === 24, "toma 24 de las hechas: " + usadas.join("+"))
ok(Number(await val(`select stock_available from products where id=$1`, [galleta])) === 0, "galletas hechas = 0")
ok(harinaAntes - Number(await val(`select stock_on_hand from supplies where id=$1`, [harina])) === 75, "6 galletas nuevas = 75 g de harina")

console.log("\n7. Factura, anticipo, pago y webhook (pedido del sistema de comisiones)")
const o3 = await val(`insert into orders (customer_id, delivery_at, source, external_ref, status) values ($1, now() + interval '3 days', 'commissions', 'COM-77', 'pending_confirmation') returning id`, [cli])
await db.query(`insert into order_items (order_id, product_id, description, quantity, unit_price) values ($1,$2,'Torta',1,1500)`, [o3, torta])
ok((await err(`insert into orders (customer_id, delivery_at, source, external_ref) values ($1, now(), 'commissions', 'COM-77')`, [cli])) !== null, "external_ref duplicado se rechaza")
await db.query(`insert into payments (order_id, amount, method) values ($1, 500, 'transfer')`, [o3])
await db.query(`update orders set status='pending' where id=$1`, [o3])
await db.query(`select start_order_preparation($1)`, [o3])
ok((await err(`select create_invoice($1)`, [o3]))?.includes("listas o entregadas"), "no factura antes de estar lista")
await db.query(`update orders set status='ready' where id=$1`, [o3])
const inv = await val(`select create_invoice($1)`, [o3])
let i = await one(`select number, payment_status from invoices where id=$1`, [inv])
ok(i.number === "FAC-0001" && i.payment_status === "partial", `${i.number} con anticipo = ${i.payment_status}`)
ok(Number(await val(`select count(*) from webhook_deliveries`)) === 0, "sin webhook todavía")
await db.query(`insert into payments (order_id, amount) values ($1, 1000)`, [o3])
ok(await val(`select payment_status from invoices where id=$1`, [inv]) === "paid", "pagada")
const wh = await one(`select event, payload from webhook_deliveries`)
ok(wh?.event === "invoice.paid" && wh.payload.external_ref === "COM-77" && Number(wh.payload.amount_paid) === 1500, "webhook en cola: " + JSON.stringify(wh?.payload))
ok((await err(`update invoices set total = 1 where id=$1`, [inv]))?.includes("no se pueden cambiar"), "montos de factura inmutables")
ok((await err(`select create_invoice($1)`, [o3]))?.includes("ya tiene"), "una factura por orden")
const bal = await one(`select balance from invoice_balances where invoice_id=$1`, [inv])
ok(Number(bal.balance) === 0, "saldo 0")

console.log("\n8. Cotización → orden, con ITBIS")
await db.exec(`update settings set itbis_enabled = true`)
const q = await val(`insert into quotes (customer_id) values ($1) returning id`, [cli])
await db.query(`insert into quote_items (quote_id, product_id, description, quantity, unit_price) values ($1,$2,'Torta',2,1500)`, [q, torta])
const qq = await one(`select number, total, tax, valid_until - issued_on as dias from quotes where id=$1`, [q])
ok(qq.number === "COT-0001" && Number(qq.tax) === 540 && Number(qq.total) === 3540 && qq.dias === 15, `${qq.number}: total ${qq.total} (ITBIS ${qq.tax}), vence en ${qq.dias} días`)
const o4 = await val(`select convert_quote_to_order($1, now() + interval '5 days')`, [q])
const oq = await one(`select total, status from orders where id=$1`, [o4])
ok(Number(oq.total) === 3540 && oq.status === "pending", "orden desde cotización con mismo total")
ok((await err(`insert into quote_items (quote_id, description, quantity, unit_price) values ($1,'x',1,1)`, [q]))?.includes("cotización accepted"), "cotización aceptada no se edita")

console.log("\n9. Ventas")
ok(Number(await val(`select total from sales_by_day`)) === 1500, "ventas del día = 1500")

console.log("\n10. Funciones de la app")
ok((await val(`select email from profiles where id=$1`, [mom])) === "mama@x.com", "el perfil guarda el correo")
const o5 = await val(`select create_order($1, $2, $3)`, [
  JSON.stringify({ customer_id: cli, delivery_at: new Date(Date.now() + 86400000).toISOString(), delivery_type: "delivery", delivery_address: "Calle 1", discount: 100 }),
  JSON.stringify([{ product_id: torta, quantity: 1, customization: "Feliz cumple" }, { description: "Topper especial", quantity: 2, unit_price: 150 }]),
  JSON.stringify({ amount: 1000, method: "transfer" }),
])
const o5row = await one(`select status, total, (select count(*)::int from order_items where order_id=$1) as items, (select sum(amount) from payments where order_id=$1) as paid from orders where id=$1`, [o5])
ok(o5row.items === 2 && Number(o5row.total) === round2((1500 + 300 - 100) * 1.18) && Number(o5row.paid) === 1000, `create_order: 2 ítems, precio del catálogo, total ${o5row.total}, anticipo ${o5row.paid}`)
ok((await err(`select create_order($1, '[]')`, [JSON.stringify({ customer_id: cli, delivery_at: new Date().toISOString() })]))?.includes("al menos un producto"), "orden sin productos se rechaza")
const q2 = await val(`select create_quote($1, $2)`, [JSON.stringify({ customer_id: cli }), JSON.stringify([{ product_id: galleta, quantity: 3, customization: "Sin nueces" }])])
const o6 = await val(`select convert_quote_to_order($1, now() + interval '3 days')`, [q2])
ok(await val(`select customization from order_items where order_id=$1`, [o6]) === "Sin nueces", "la personalización pasa de la cotización a la orden")
const p3 = await val(`select save_product($1, $2)`, [
  JSON.stringify({ name: "Brownie", price: 600, emoji: "🍫", recipe_yield: 6 }),
  JSON.stringify([{ supply_id: harina, quantity: 200 }, { supply_id: azucar, quantity: 150 }]),
])
await db.query(`select save_product($1, $2)`, [JSON.stringify({ id: p3, name: "Brownie", price: 650, emoji: "🍫", recipe_yield: 6 }), JSON.stringify([{ supply_id: harina, quantity: 250 }])])
const p3row = await one(`select price, emoji, (select count(*)::int from recipe_items where product_id=$1) as lines from products where id=$1`, [p3])
ok(Number(p3row.price) === 650 && p3row.lines === 1 && p3row.emoji === "🍫", "save_product crea, edita y reemplaza la receta")
const harinaAntesCompra = Number(await val(`select stock_on_hand from supplies where id=$1`, [harina]))
await db.query(`select record_purchase($1, $2)`, [JSON.stringify({ supplier: "Mercado" }), JSON.stringify([{ supply_id: harina, quantity: 1000, total_cost: 50 }, { supply_id: huevos, quantity: 30, total_cost: 240 }])])
ok(Number(await val(`select stock_on_hand from supplies where id=$1`, [harina])) === harinaAntesCompra + 1000, "record_purchase sube el stock de varios insumos")
const c1 = await val(`select find_or_create_customer('Ana P.', '(809) 555-0000')`)
const c2 = await val(`select find_or_create_customer('Nuevo Cliente', '829-111-2222')`)
ok(c1 === cli && c2 !== cli, "find_or_create_customer reconoce el teléfono con otro formato")
await db.exec(`update settings set itbis_enabled = false`)

console.log("\n11. Correcciones")
const rdToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(new Date())
const todayRd = await val(`select today_rd()::text`)
ok(todayRd === rdToday, `today_rd() = ${todayRd} (hora de RD)`)
ok((await val(`select column_default from information_schema.columns where table_name='invoices' and column_name='issued_on'`))?.includes("today_rd"), "las facturas toman la fecha de RD")
await db.exec(`reset role`)
const pendientes = Number(await val(`select count(*) from webhook_deliveries where status='pending'`))
const claim1 = (await db.query(`select * from claim_webhook_deliveries(20)`)).rows.length
const claim2 = (await db.query(`select * from claim_webhook_deliveries(20)`)).rows.length
ok(claim1 === pendientes && claim1 > 0 && claim2 === 0, `un aviso reservado no se toma dos veces (${claim1} y luego ${claim2})`)
await as(mom)
ok((await err(`select * from claim_webhook_deliveries(20)`)) !== null, "los usuarios no pueden reservar avisos (solo el servidor)")

console.log("\n12. Stock de productos")
await as(mom)
const flan = await val(`insert into products (name, price) values ('Flan', 1200) returning id`)
const harinaAntesFlan = Number(await val(`select stock_on_hand from supplies where id=$1`, [harina]))
await db.query(`insert into recipe_items (product_id, supply_id, quantity) values ($1, $2, 100)`, [flan, harina])
r = await val(`select register_production($1, 5, false)`, [flan])
const flanRow = await one(`select track_stock, stock_available from products where id=$1`, [flan])
ok(r.ok && flanRow.track_stock === true && Number(flanRow.stock_available) === 5, "agregar sin descontar receta activa el stock y suma 5")
ok(Number(await val(`select stock_on_hand from supplies where id=$1`, [harina])) === harinaAntesFlan, "sin descontar receta, la harina no cambia")
r = await val(`select register_production($1, 2)`, [flan])
ok(r.ok && Number(await val(`select stock_on_hand from supplies where id=$1`, [harina])) === harinaAntesFlan - 200, "con receta descuenta 200 g de harina")
await db.query(`insert into product_movements (product_id, type, quantity, notes) values ($1, 'waste', -1, 'Se cayó')`, [flan])
ok(Number(await val(`select stock_available from products where id=$1`, [flan])) === 6, "merma de 1: quedan 6")
const o7 = await val(`select create_order($1, $2)`, [
  JSON.stringify({ customer_id: cli, delivery_at: new Date(Date.now() + 86400000).toISOString() }),
  JSON.stringify([{ product_id: flan, quantity: 4 }]),
])
await db.query(`select start_order_preparation($1)`, [o7])
ok(Number(await val(`select stock_available from products where id=$1`, [flan])) === 2, "una orden de 4 flanes toma 4 del stock: quedan 2")
await db.query(`select cancel_order($1)`, [o7])
ok(Number(await val(`select stock_available from products where id=$1`, [flan])) === 6, "al cancelar, los 4 flanes vuelven: 6")

console.log("\n13. Permisos")
await as(intruder)
ok(Number(await val(`select count(*) from orders`)) === 0, "usuario sin rol no ve órdenes")
ok((await err(`insert into customers (name) values ('x')`)) !== null, "usuario sin rol no puede crear")
await as(null)
ok((await err(`select * from orders`)) !== null, "anon no tiene acceso")
ok((await err(`select start_order_preparation($1)`, [o4])) !== null, "anon no puede llamar funciones")

console.log(fails ? `\n❌ ${fails} pruebas fallaron` : "\n✅ Todas las pruebas pasaron")
process.exit(fails ? 1 : 0)
