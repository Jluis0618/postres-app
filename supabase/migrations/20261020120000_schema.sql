-- Esquema base: tipos, tablas e índices.
-- Ver docs/modelo-datos.md para la explicación de cada tabla.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'assistant');
create type public.supply_unit as enum ('g', 'ml', 'unit');
create type public.supply_movement_type as enum (
  'purchase', 'order_consumption', 'order_return', 'production', 'adjustment', 'waste'
);
create type public.product_movement_type as enum (
  'production', 'order_sale', 'order_return', 'adjustment', 'waste'
);
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type public.order_status as enum (
  'pending_confirmation', 'pending', 'in_preparation', 'ready', 'delivered', 'cancelled'
);
create type public.order_source as enum ('manual', 'commissions');
create type public.delivery_type as enum ('pickup', 'delivery');
create type public.invoice_status as enum ('issued', 'void');
create type public.payment_status as enum ('unpaid', 'partial', 'paid');
create type public.payment_method as enum ('cash', 'transfer', 'card', 'other');
create type public.webhook_status as enum ('pending', 'sent', 'failed');

-- Numeración de documentos: COT-0001, ORD-0001, FAC-0001.
create sequence public.quote_number_seq;
create sequence public.order_number_seq;
create sequence public.invoice_number_seq;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Configuración y usuarios
-- ---------------------------------------------------------------------------

-- Una sola fila (id = 1).
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Mi negocio de postres',
  phone text,
  address text,
  tax_id text,
  logo_url text,
  itbis_enabled boolean not null default false,
  itbis_rate numeric(5,2) not null default 18.00 check (itbis_rate between 0 and 100),
  invoice_note text,
  quote_note text,
  quote_validity_days int not null default 15 check (quote_validity_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.settings default values;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  -- null = sin acceso al sistema
  role public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo e inventario
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  unit text not null default 'unidad',
  photo_url text,
  track_stock boolean not null default false,
  stock_available numeric(12,3) not null default 0 check (stock_available >= 0),
  recipe_yield numeric(12,3) not null default 1 check (recipe_yield > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit public.supply_unit not null,
  stock_on_hand numeric(12,3) not null default 0 check (stock_on_hand >= 0),
  min_stock numeric(12,3) not null default 0 check (min_stock >= 0),
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  supplier text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  supply_id uuid not null references public.supplies (id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, supply_id)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchased_on date not null default current_date,
  supplier text,
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inmutable: para corregir una compra se hace un ajuste.
create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete restrict,
  supply_id uuid not null references public.supplies (id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  total_cost numeric(12,2) not null check (total_cost >= 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  tax_id text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique
    default 'COT-' || lpad(nextval('public.quote_number_seq')::text, 4, '0'),
  customer_id uuid not null references public.customers (id) on delete restrict,
  issued_on date not null default current_date,
  -- Si no se indica, se calcula con settings.quote_validity_days.
  valid_until date,
  status public.quote_status not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0 check (discount >= 0),
  -- Si no se indica, se toma de settings al crearla.
  tax_rate numeric(5,2) not null,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique
    default 'ORD-' || lpad(nextval('public.order_number_seq')::text, 4, '0'),
  customer_id uuid not null references public.customers (id) on delete restrict,
  quote_id uuid references public.quotes (id) on delete set null,
  delivery_at timestamptz not null,
  delivery_type public.delivery_type not null default 'pickup',
  delivery_address text,
  status public.order_status not null default 'pending',
  source public.order_source not null default 'manual',
  external_ref text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0 check (discount >= 0),
  tax_rate numeric(5,2) not null,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  -- Cuándo se descontaron los insumos (al pasar a in_preparation).
  supplies_consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_external_ref_required check (source = 'manual' or external_ref is not null)
);

alter table public.quotes
  add constraint quotes_order_id_fkey
  foreign key (order_id) references public.orders (id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- null = ítem especial sin producto del catálogo (no descuenta insumos)
  product_id uuid references public.products (id) on delete restrict,
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  customization text,
  -- Unidades tomadas de productos ya hechos.
  qty_from_stock numeric(12,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_qty_from_stock_check check (qty_from_stock between 0 and quantity)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique
    default 'FAC-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0'),
  order_id uuid not null references public.orders (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  issued_on date not null default current_date,
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null,
  tax_rate numeric(5,2) not null,
  tax numeric(12,2) not null,
  total numeric(12,2) not null,
  status public.invoice_status not null default 'issued',
  payment_status public.payment_status not null default 'unpaid',
  -- Comprobante fiscal (e-NCF), para el futuro.
  ncf text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Los pagos y anticipos van a la orden; la factura los toma en cuenta.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  paid_at timestamptz not null default now(),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Movimientos de inventario (historial, inmutable)
-- ---------------------------------------------------------------------------

create table public.supply_movements (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.supplies (id) on delete restrict,
  type public.supply_movement_type not null,
  -- Positiva = entra, negativa = sale.
  quantity numeric(12,3) not null,
  unit_cost numeric(12,4) not null default 0,
  order_id uuid references public.orders (id) on delete restrict,
  purchase_id uuid references public.purchases (id) on delete restrict,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint supply_movements_sign_check check (
    (type in ('purchase', 'order_return') and quantity > 0)
    or (type in ('order_consumption', 'production', 'waste') and quantity < 0)
    or (type = 'adjustment' and quantity <> 0)
  )
);

create table public.product_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  type public.product_movement_type not null,
  quantity numeric(12,3) not null,
  order_id uuid references public.orders (id) on delete restrict,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint product_movements_sign_check check (
    (type in ('production', 'order_return') and quantity > 0)
    or (type in ('order_sale', 'waste') and quantity < 0)
    or (type = 'adjustment' and quantity <> 0)
  )
);

-- ---------------------------------------------------------------------------
-- Integración con el sistema de comisiones
-- ---------------------------------------------------------------------------

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  order_id uuid not null references public.orders (id) on delete restrict,
  payload jsonb not null,
  status public.webhook_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'profiles', 'categories', 'products', 'supplies', 'recipe_items',
    'purchases', 'customers', 'quotes', 'quote_items', 'orders', 'order_items',
    'invoices', 'payments', 'webhook_deliveries'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index products_category_id_idx on public.products (category_id);
create index recipe_items_supply_id_idx on public.recipe_items (supply_id);
create index purchase_items_purchase_id_idx on public.purchase_items (purchase_id);
create index purchase_items_supply_id_idx on public.purchase_items (supply_id);
create index quotes_customer_id_idx on public.quotes (customer_id);
create index quotes_order_id_idx on public.quotes (order_id);
create index quote_items_quote_id_idx on public.quote_items (quote_id);
create index quote_items_product_id_idx on public.quote_items (product_id);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_quote_id_idx on public.orders (quote_id);
create index orders_delivery_at_idx on public.orders (delivery_at);
create index orders_status_idx on public.orders (status);
-- Evita pedidos duplicados del sistema de comisiones.
create unique index orders_source_external_ref_key
  on public.orders (source, external_ref) where external_ref is not null;
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
-- Una sola factura vigente por orden.
create unique index invoices_one_issued_per_order
  on public.invoices (order_id) where status = 'issued';
create index invoices_customer_id_idx on public.invoices (customer_id);
create index invoices_issued_on_idx on public.invoices (issued_on);
create index payments_order_id_idx on public.payments (order_id);
create index supply_movements_supply_id_idx on public.supply_movements (supply_id, created_at);
create index supply_movements_order_id_idx on public.supply_movements (order_id);
create index supply_movements_purchase_id_idx on public.supply_movements (purchase_id);
create index product_movements_product_id_idx on public.product_movements (product_id, created_at);
create index product_movements_order_id_idx on public.product_movements (order_id);
create index webhook_deliveries_pending_idx
  on public.webhook_deliveries (next_attempt_at) where status = 'pending';
create index webhook_deliveries_order_id_idx on public.webhook_deliveries (order_id);
