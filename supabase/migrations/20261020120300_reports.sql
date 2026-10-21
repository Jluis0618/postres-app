-- Vistas y funciones de consulta: costos, alertas, lista de compras y ventas.
-- Las vistas usan security_invoker para respetar los permisos (RLS) de quien consulta.

-- Costo de cada producto según su receta, y su margen.
create view public.product_costs
with (security_invoker = true)
as
select c.product_id,
       c.name,
       c.price,
       c.unit_cost,
       c.price - c.unit_cost as margin,
       case when c.price > 0 then round((c.price - c.unit_cost) / c.price * 100, 1) end as margin_pct,
       c.recipe_items
  from (
    select p.id as product_id,
           p.name,
           p.price,
           round(coalesce(sum(ri.quantity * s.unit_cost), 0) / p.recipe_yield, 2) as unit_cost,
           count(ri.id) as recipe_items
      from public.products p
      left join public.recipe_items ri on ri.product_id = p.id
      left join public.supplies s on s.id = ri.supply_id
     group by p.id
  ) c;

-- Insumos por debajo del mínimo.
create view public.low_stock_supplies
with (security_invoker = true)
as
select id as supply_id, name, unit, stock_on_hand, min_stock,
       min_stock - stock_on_hand as below_by
  from public.supplies
 where is_active
   and stock_on_hand < min_stock;

-- Qué comprar para cubrir las órdenes de los próximos p_days días
-- y quedar al menos en el stock mínimo.
create function public.shopping_list(p_days int default 7)
returns table (
  supply_id uuid,
  name text,
  unit public.supply_unit,
  required numeric,
  stock_on_hand numeric,
  min_stock numeric,
  to_buy numeric
)
language sql
stable
set search_path = ''
as $$
  with req as (
    select r.supply_id, round(sum(r.quantity), 3) as qty
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
     cross join lateral public.recipe_requirements(oi.product_id, oi.quantity) r
     where o.status in ('pending_confirmation', 'pending')
       and o.delivery_at < now() + make_interval(days => p_days)
     group by r.supply_id
  )
  select s.id,
         s.name,
         s.unit,
         coalesce(req.qty, 0),
         s.stock_on_hand,
         s.min_stock,
         coalesce(req.qty, 0) + s.min_stock - s.stock_on_hand
    from public.supplies s
    left join req on req.supply_id = s.id
   where s.is_active
     and coalesce(req.qty, 0) + s.min_stock - s.stock_on_hand > 0
   order by s.name
$$;

-- Saldo de cada factura vigente (cuentas por cobrar).
create view public.invoice_balances
with (security_invoker = true)
as
select i.id as invoice_id,
       i.number,
       i.order_id,
       i.customer_id,
       i.issued_on,
       i.total,
       coalesce(p.paid, 0) as paid,
       greatest(i.total - coalesce(p.paid, 0), 0) as balance,
       i.payment_status
  from public.invoices i
  left join (
    select order_id, sum(amount) as paid
      from public.payments
     group by order_id
  ) p on p.order_id = i.order_id
 where i.status = 'issued';

-- Ventas = facturas vigentes.
create view public.sales_by_day
with (security_invoker = true)
as
select issued_on as day,
       count(*) as invoices,
       sum(total) as total
  from public.invoices
 where status = 'issued'
 group by issued_on;

create view public.sales_by_product
with (security_invoker = true)
as
select date_trunc('month', i.issued_on)::date as month,
       oi.product_id,
       coalesce(p.name, oi.description) as name,
       sum(oi.quantity) as quantity,
       sum(oi.total) as total
  from public.invoices i
  join public.order_items oi on oi.order_id = i.order_id
  left join public.products p on p.id = oi.product_id
 where i.status = 'issued'
 group by 1, 2, 3;

create view public.sales_by_customer
with (security_invoker = true)
as
select date_trunc('month', i.issued_on)::date as month,
       i.customer_id,
       c.name,
       count(*) as invoices,
       sum(i.total) as total
  from public.invoices i
  join public.customers c on c.id = i.customer_id
 where i.status = 'issued'
 group by 1, 2, 3;
