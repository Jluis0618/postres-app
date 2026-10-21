-- Funciones que usa la app (y la API) para guardar documentos completos en un solo paso,
-- más algunas columnas que pidió el diseño.

-- ---------------------------------------------------------------------------
-- Columnas nuevas
-- ---------------------------------------------------------------------------

-- Correo en el perfil, para la lista de usuarios de Configuración.
alter table public.profiles add column email text;

update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profiles) then null else 'admin'::public.user_role end
  );
  return new;
end;
$$;

-- Personalización también en las cotizaciones ("Dos pisos, boda civil").
alter table public.quote_items add column customization text;

-- Ícono del producto cuando no hay foto.
alter table public.products add column emoji text not null default '🎂';

-- ---------------------------------------------------------------------------
-- Órdenes y cotizaciones completas
-- ---------------------------------------------------------------------------

-- Ítems: [{ product_id?, description?, quantity, unit_price?, customization? }]
-- Si viene product_id sin descripción o sin precio, se toman del catálogo.
create function public.create_order(p_order jsonb, p_items jsonb, p_deposit jsonb default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La orden necesita al menos un producto';
  end if;

  insert into public.orders (
    customer_id, delivery_at, delivery_type, delivery_address, discount, notes, status, source, external_ref
  )
  values (
    (p_order ->> 'customer_id')::uuid,
    (p_order ->> 'delivery_at')::timestamptz,
    coalesce(p_order ->> 'delivery_type', 'pickup')::public.delivery_type,
    nullif(p_order ->> 'delivery_address', ''),
    coalesce((p_order ->> 'discount')::numeric, 0),
    nullif(p_order ->> 'notes', ''),
    coalesce(p_order ->> 'status', 'pending')::public.order_status,
    coalesce(p_order ->> 'source', 'manual')::public.order_source,
    nullif(p_order ->> 'external_ref', '')
  )
  returning id into v_id;

  insert into public.order_items (order_id, product_id, description, quantity, unit_price, customization)
  select v_id,
         p.id,
         coalesce(nullif(i ->> 'description', ''), p.name),
         (i ->> 'quantity')::numeric,
         coalesce((i ->> 'unit_price')::numeric, p.price),
         nullif(i ->> 'customization', '')
    from jsonb_array_elements(p_items) with ordinality as t (i, n)
    left join public.products p on p.id = nullif(i ->> 'product_id', '')::uuid
   order by n;

  if exists (
    select 1 from public.order_items
     where order_id = v_id and (description is null or unit_price is null)
  ) then
    raise exception 'Cada producto necesita descripción y precio';
  end if;

  if coalesce((p_deposit ->> 'amount')::numeric, 0) > 0 then
    insert into public.payments (order_id, amount, method, reference)
    values (
      v_id,
      (p_deposit ->> 'amount')::numeric,
      coalesce(p_deposit ->> 'method', 'cash')::public.payment_method,
      nullif(p_deposit ->> 'reference', '')
    );
  end if;

  return v_id;
end;
$$;

create function public.create_quote(p_quote jsonb, p_items jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La cotización necesita al menos un producto';
  end if;

  insert into public.quotes (customer_id, valid_until, discount, notes)
  values (
    (p_quote ->> 'customer_id')::uuid,
    nullif(p_quote ->> 'valid_until', '')::date,
    coalesce((p_quote ->> 'discount')::numeric, 0),
    nullif(p_quote ->> 'notes', '')
  )
  returning id into v_id;

  insert into public.quote_items (quote_id, product_id, description, quantity, unit_price, customization)
  select v_id,
         p.id,
         coalesce(nullif(i ->> 'description', ''), p.name),
         (i ->> 'quantity')::numeric,
         coalesce((i ->> 'unit_price')::numeric, p.price),
         nullif(i ->> 'customization', '')
    from jsonb_array_elements(p_items) with ordinality as t (i, n)
    left join public.products p on p.id = nullif(i ->> 'product_id', '')::uuid
   order by n;

  return v_id;
end;
$$;

-- Igual que antes, pero ahora también copia la personalización.
create or replace function public.convert_quote_to_order(
  p_quote_id uuid,
  p_delivery_at timestamptz,
  p_delivery_type public.delivery_type default 'pickup',
  p_delivery_address text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_order_id uuid;
begin
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Cotización no encontrada';
  end if;
  if v_quote.order_id is not null then
    raise exception 'Esta cotización ya se convirtió en una orden';
  end if;
  if v_quote.status in ('rejected', 'expired') then
    raise exception 'No se puede convertir una cotización %', v_quote.status;
  end if;

  insert into public.orders (
    customer_id, quote_id, delivery_at, delivery_type, delivery_address,
    discount, tax_rate, notes, status
  )
  values (
    v_quote.customer_id, v_quote.id, p_delivery_at, p_delivery_type, p_delivery_address,
    v_quote.discount, v_quote.tax_rate, v_quote.notes, 'pending'
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, description, quantity, unit_price, customization, created_at)
  select v_order_id, qi.product_id, qi.description, qi.quantity, qi.unit_price, qi.customization, qi.created_at
    from public.quote_items qi
   where qi.quote_id = p_quote_id;

  update public.quotes
     set status = 'accepted',
         order_id = v_order_id
   where id = p_quote_id;

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Productos con receta y compras
-- ---------------------------------------------------------------------------

-- p_product: { id?, name, description, category_id, price, unit, emoji, track_stock, recipe_yield, is_active }
-- p_recipe: [{ supply_id, quantity }] reemplaza la receta completa.
create function public.save_product(p_product jsonb, p_recipe jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_product ->> 'id', '')::uuid;
begin
  if v_id is null then
    insert into public.products (name, description, category_id, price, unit, emoji, track_stock, recipe_yield)
    values (
      p_product ->> 'name',
      nullif(p_product ->> 'description', ''),
      nullif(p_product ->> 'category_id', '')::uuid,
      coalesce((p_product ->> 'price')::numeric, 0),
      coalesce(nullif(p_product ->> 'unit', ''), 'unidad'),
      coalesce(nullif(p_product ->> 'emoji', ''), '🎂'),
      coalesce((p_product ->> 'track_stock')::boolean, false),
      coalesce((p_product ->> 'recipe_yield')::numeric, 1)
    )
    returning id into v_id;
  else
    update public.products
       set name = p_product ->> 'name',
           description = nullif(p_product ->> 'description', ''),
           category_id = nullif(p_product ->> 'category_id', '')::uuid,
           price = coalesce((p_product ->> 'price')::numeric, 0),
           unit = coalesce(nullif(p_product ->> 'unit', ''), 'unidad'),
           emoji = coalesce(nullif(p_product ->> 'emoji', ''), '🎂'),
           track_stock = coalesce((p_product ->> 'track_stock')::boolean, false),
           recipe_yield = coalesce((p_product ->> 'recipe_yield')::numeric, 1),
           is_active = coalesce((p_product ->> 'is_active')::boolean, true)
     where id = v_id;
    if not found then
      raise exception 'Producto no encontrado';
    end if;
  end if;

  delete from public.recipe_items where product_id = v_id;
  insert into public.recipe_items (product_id, supply_id, quantity)
  select v_id, (r ->> 'supply_id')::uuid, sum((r ->> 'quantity')::numeric)
    from jsonb_array_elements(coalesce(p_recipe, '[]'::jsonb)) r
   where coalesce((r ->> 'quantity')::numeric, 0) > 0
   group by (r ->> 'supply_id')::uuid;

  return v_id;
end;
$$;

-- p_items: [{ supply_id, quantity, total_cost }]
create function public.record_purchase(p_purchase jsonb, p_items jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La compra necesita al menos un insumo';
  end if;

  insert into public.purchases (purchased_on, supplier, notes)
  values (
    coalesce(nullif(p_purchase ->> 'purchased_on', '')::date, current_date),
    nullif(p_purchase ->> 'supplier', ''),
    nullif(p_purchase ->> 'notes', '')
  )
  returning id into v_id;

  insert into public.purchase_items (purchase_id, supply_id, quantity, total_cost)
  select v_id, (i ->> 'supply_id')::uuid, (i ->> 'quantity')::numeric, coalesce((i ->> 'total_cost')::numeric, 0)
    from jsonb_array_elements(p_items) i;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Clientes que llegan por la API: se reconocen por teléfono
-- ---------------------------------------------------------------------------

create function public.find_or_create_customer(
  p_name text,
  p_phone text,
  p_email text default null,
  p_address text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_digits text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_id uuid;
begin
  if v_digits <> '' then
    select id into v_id
      from public.customers
     where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = v_digits
     order by created_at
     limit 1;
  end if;

  if v_id is null then
    insert into public.customers (name, phone, email, address)
    values (p_name, nullif(p_phone, ''), nullif(p_email, ''), nullif(p_address, ''))
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_order(jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.create_quote(jsonb, jsonb) from public, anon;
revoke execute on function public.convert_quote_to_order(uuid, timestamptz, public.delivery_type, text) from public, anon;
revoke execute on function public.save_product(jsonb, jsonb) from public, anon;
revoke execute on function public.record_purchase(jsonb, jsonb) from public, anon;
revoke execute on function public.find_or_create_customer(text, text, text, text) from public, anon;
