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

console.log("\n10. Permisos")
await as(intruder)
ok(Number(await val(`select count(*) from orders`)) === 0, "usuario sin rol no ve órdenes")
ok((await err(`insert into customers (name) values ('x')`)) !== null, "usuario sin rol no puede crear")
await as(null)
ok((await err(`select * from orders`)) !== null, "anon no tiene acceso")
ok((await err(`select start_order_preparation($1)`, [o4])) !== null, "anon no puede llamar funciones")

console.log(fails ? `\n❌ ${fails} pruebas fallaron` : "\n✅ Todas las pruebas pasaron")
process.exit(fails ? 1 : 0)
