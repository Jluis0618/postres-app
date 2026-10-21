-- Ventas: totales, flujo de órdenes, facturas, pagos y avisos al sistema de comisiones.
--
-- Bandera de transacción:
--   app.order_transition = 'on' mientras una función de este archivo cambia el
--   estado de una orden o sus ítems (start_order_preparation, cancel_order).

-- ---------------------------------------------------------------------------
-- Totales
-- ---------------------------------------------------------------------------

create function public.default_tax_rate()
returns numeric
language sql
stable
set search_path = ''
as $$
  select case when itbis_enabled then itbis_rate else 0 end
    from public.settings
   where id = 1
$$;

create function public.compute_quote_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.tax_rate := coalesce(new.tax_rate, public.default_tax_rate());
    new.valid_until := coalesce(
      new.valid_until,
      new.issued_on + (select quote_validity_days from public.settings where id = 1));
  end if;

  select coalesce(sum(total), 0) into new.subtotal
    from public.quote_items
   where quote_id = new.id;
  new.tax := round(greatest(new.subtotal - new.discount, 0) * new.tax_rate / 100, 2);
  new.total := greatest(new.subtotal - new.discount, 0) + new.tax;
  return new;
end;
$$;

create trigger compute_quote_totals
  before insert or update on public.quotes
  for each row execute function public.compute_quote_totals();

create function public.compute_order_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.tax_rate := coalesce(new.tax_rate, public.default_tax_rate());
  end if;

  select coalesce(sum(total), 0) into new.subtotal
    from public.order_items
   where order_id = new.id;
  new.tax := round(greatest(new.subtotal - new.discount, 0) * new.tax_rate / 100, 2);
  new.total := greatest(new.subtotal - new.discount, 0) + new.tax;
  return new;
end;
$$;

create trigger compute_order_totals
  before insert or update on public.orders
  for each row execute function public.compute_order_totals();

-- Al cambiar un ítem se "toca" el documento para que recalcule sus totales.
create function public.touch_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.quotes set updated_at = now() where id = coalesce(new.quote_id, old.quote_id);
  return null;
end;
$$;

create trigger touch_quote
  after insert or update or delete on public.quote_items
  for each row execute function public.touch_quote();

create function public.touch_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.orders set updated_at = now() where id = coalesce(new.order_id, old.order_id);
  return null;
end;
$$;

create trigger touch_order
  after insert or update or delete on public.order_items
  for each row execute function public.touch_order();

-- ---------------------------------------------------------------------------
-- Reglas de edición
-- ---------------------------------------------------------------------------

create function public.guard_quote_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.quote_status;
begin
  select status into v_status from public.quotes where id = coalesce(new.quote_id, old.quote_id);
  if found and v_status not in ('draft', 'sent') then
    raise exception 'No se pueden cambiar los productos de una cotización %', v_status;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_quote_items
  before insert or update or delete on public.quote_items
  for each row execute function public.guard_quote_items();

create function public.guard_order_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  if current_setting('app.order_transition', true) = 'on' then
    return coalesce(new, old);
  end if;

  select status into v_status from public.orders where id = coalesce(new.order_id, old.order_id);
  if found and v_status not in ('pending_confirmation', 'pending') then
    raise exception 'No se pueden cambiar los productos de una orden que ya está en preparación';
  end if;
  if tg_op = 'UPDATE' and new.qty_from_stock is distinct from old.qty_from_stock then
    raise exception 'qty_from_stock lo asigna start_order_preparation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_order_items
  before insert or update or delete on public.order_items
  for each row execute function public.guard_order_items();

-- Cambios de estado permitidos a mano. Preparar y cancelar se hacen con
-- start_order_preparation y cancel_order porque mueven inventario.
create function public.guard_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status not in ('pending_confirmation', 'pending') then
      raise exception 'Una orden nueva debe empezar como pendiente o por confirmar';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status not in ('pending_confirmation', 'pending') then
      raise exception 'Solo se pueden borrar órdenes pendientes; usa cancel_order';
    end if;
    return old;
  end if;

  if new.status is distinct from old.status
     and current_setting('app.order_transition', true) is distinct from 'on' then
    if new.status = 'in_preparation' and old.status = 'pending' then
      raise exception 'Usa start_order_preparation para pasar a preparación (descuenta insumos)';
    elsif new.status = 'cancelled' then
      raise exception 'Usa cancel_order para cancelar una orden';
    elsif old.status::text || '>' || new.status::text not in (
      'pending_confirmation>pending',
      'in_preparation>ready',
      'ready>in_preparation',
      'ready>delivered',
      'delivered>ready'
    ) then
      raise exception 'No se puede pasar una orden de % a %', old.status, new.status;
    end if;
  end if;

  if new.supplies_consumed_at is distinct from old.supplies_consumed_at
     and current_setting('app.order_transition', true) is distinct from 'on' then
    raise exception 'supplies_consumed_at lo asigna start_order_preparation';
  end if;

  return new;
end;
$$;

create trigger guard_order_status
  before insert or update or delete on public.orders
  for each row execute function public.guard_order_status();

-- ---------------------------------------------------------------------------
-- Preparación: toma productos hechos y descuenta insumos
-- ---------------------------------------------------------------------------

-- Cuántas unidades de cada ítem salen de productos ya hechos.
-- Si dos ítems piden el mismo producto, el stock se reparte en orden.
create function public.order_stock_allocation(p_order_id uuid)
returns table (item_id uuid, product_id uuid, quantity numeric, from_stock numeric)
language sql
stable
set search_path = ''
as $$
  select oi.id,
         oi.product_id,
         oi.quantity,
         case when p.track_stock
              then greatest(0, least(oi.quantity,
                     p.stock_available - (sum(oi.quantity) over w - oi.quantity)))
              else 0
         end
    from public.order_items oi
    join public.products p on p.id = oi.product_id
   where oi.order_id = p_order_id
  window w as (partition by oi.product_id order by oi.created_at, oi.id)
$$;

-- Insumos que necesita una orden, después de usar los productos ya hechos.
create function public.order_supply_requirements(p_order_id uuid)
returns table (supply_id uuid, quantity numeric)
language sql
stable
set search_path = ''
as $$
  select r.supply_id, round(sum(r.quantity), 3)
    from public.order_stock_allocation(p_order_id) a
   cross join lateral public.recipe_requirements(a.product_id, a.quantity - a.from_stock) r
   group by r.supply_id
$$;

-- Pasa una orden pendiente a "en preparación".
-- Si falta algún insumo no cambia nada y devuelve { ok: false, missing: [...] }.
create function public.start_order_preparation(p_order_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_missing jsonb;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Orden no encontrada';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'Solo se pueden preparar órdenes pendientes (estado actual: %)', v_order.status;
  end if;

  -- Bloquea lo que se va a usar para que otra operación no lo tome a la vez.
  perform 1
     from public.products p
    where p.id in (select oi.product_id from public.order_items oi where oi.order_id = p_order_id)
      for update;
  perform 1
     from public.supplies s
    where s.id in (select r.supply_id from public.order_supply_requirements(p_order_id) r)
      for update;

  select jsonb_agg(jsonb_build_object(
           'supply_id', s.id,
           'name', s.name,
           'unit', s.unit,
           'required', r.quantity,
           'available', s.stock_on_hand,
           'missing', r.quantity - s.stock_on_hand
         ) order by s.name)
    into v_missing
    from public.order_supply_requirements(p_order_id) r
    join public.supplies s on s.id = r.supply_id
   where r.quantity > s.stock_on_hand;

  if v_missing is not null then
    return jsonb_build_object('ok', false, 'missing', v_missing);
  end if;

  perform set_config('app.order_transition', 'on', true);

  -- Primero los insumos: la asignación de stock se calcula con el stock actual.
  insert into public.supply_movements (supply_id, type, quantity, unit_cost, order_id)
  select r.supply_id, 'order_consumption', -r.quantity, s.unit_cost, p_order_id
    from public.order_supply_requirements(p_order_id) r
    join public.supplies s on s.id = r.supply_id
   where r.quantity > 0;

  update public.order_items oi
     set qty_from_stock = a.from_stock
    from public.order_stock_allocation(p_order_id) a
   where oi.id = a.item_id;

  insert into public.product_movements (product_id, type, quantity, order_id)
  select oi.product_id, 'order_sale', -sum(oi.qty_from_stock), p_order_id
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.qty_from_stock > 0
   group by oi.product_id;

  update public.orders
     set status = 'in_preparation',
         supplies_consumed_at = now()
   where id = p_order_id;

  perform set_config('app.order_transition', 'off', true);
  return jsonb_build_object('ok', true);
end;
$$;

-- Cancela una orden. Si ya se habían descontado insumos, se devuelven al
-- inventario; lo indicado en p_waste se registra como merma.
-- p_waste: [{ "supply_id": "...", "quantity": 100 }]
create function public.cancel_order(p_order_id uuid, p_waste jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_invalid text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Orden no encontrada';
  end if;
  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'No se puede cancelar una orden %', v_order.status;
  end if;
  if exists (select 1 from public.invoices where order_id = p_order_id and status = 'issued') then
    raise exception 'La orden tiene una factura vigente. Anula la factura primero.';
  end if;

  if v_order.supplies_consumed_at is not null then
    with consumed as (
      select m.supply_id, -sum(m.quantity) as qty
        from public.supply_movements m
       where m.order_id = p_order_id and m.type = 'order_consumption'
       group by m.supply_id
    ), waste as (
      select w.supply_id, sum(w.quantity) as qty
        from jsonb_to_recordset(p_waste) as w (supply_id uuid, quantity numeric)
       group by w.supply_id
    )
    select string_agg(coalesce(s.name, w.supply_id::text), ', ')
      into v_invalid
      from waste w
      left join consumed c on c.supply_id = w.supply_id
      left join public.supplies s on s.id = w.supply_id
     where w.qty is null or w.qty <= 0 or c.qty is null or w.qty > c.qty;

    if v_invalid is not null then
      raise exception 'Merma inválida para: % (debe ser mayor que 0 y no más de lo usado en la orden)', v_invalid;
    end if;

    insert into public.supply_movements (supply_id, type, quantity, unit_cost, order_id, notes)
    select m.supply_id, 'order_return', -sum(m.quantity), s.unit_cost, p_order_id, 'Orden cancelada'
      from public.supply_movements m
      join public.supplies s on s.id = m.supply_id
     where m.order_id = p_order_id and m.type = 'order_consumption'
     group by m.supply_id, s.unit_cost;

    insert into public.supply_movements (supply_id, type, quantity, unit_cost, order_id, notes)
    select w.supply_id, 'waste', -sum(w.quantity), s.unit_cost, p_order_id, 'Merma por orden cancelada'
      from jsonb_to_recordset(p_waste) as w (supply_id uuid, quantity numeric)
      join public.supplies s on s.id = w.supply_id
     group by w.supply_id, s.unit_cost;

    insert into public.product_movements (product_id, type, quantity, order_id, notes)
    select oi.product_id, 'order_return', sum(oi.qty_from_stock), p_order_id, 'Orden cancelada'
      from public.order_items oi
     where oi.order_id = p_order_id and oi.qty_from_stock > 0
     group by oi.product_id;
  elsif jsonb_array_length(p_waste) > 0 then
    raise exception 'Esta orden no había descontado insumos; no hay merma que registrar';
  end if;

  perform set_config('app.order_transition', 'on', true);
  update public.orders set status = 'cancelled' where id = p_order_id;
  perform set_config('app.order_transition', 'off', true);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Cotización → orden
-- ---------------------------------------------------------------------------

create function public.convert_quote_to_order(
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

  insert into public.order_items (order_id, product_id, description, quantity, unit_price, created_at)
  select v_order_id, qi.product_id, qi.description, qi.quantity, qi.unit_price, qi.created_at
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
-- Facturas y pagos
-- ---------------------------------------------------------------------------

create function public.refresh_invoice_payment_status(p_order_id uuid)
returns void
language sql
set search_path = ''
as $$
  with paid as (
    select coalesce(sum(amount), 0) as amount
      from public.payments
     where order_id = p_order_id
  ), calc as (
    select i.id,
           case when paid.amount >= i.total then 'paid'::public.payment_status
                when paid.amount > 0 then 'partial'::public.payment_status
                else 'unpaid'::public.payment_status
           end as status
      from public.invoices i, paid
     where i.order_id = p_order_id
       and i.status = 'issued'
  )
  update public.invoices i
     set payment_status = calc.status
    from calc
   where i.id = calc.id
     and i.payment_status is distinct from calc.status
$$;

-- La orden se convierte en factura (una por orden).
create function public.create_invoice(p_order_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_invoice_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Orden no encontrada';
  end if;
  if v_order.status not in ('ready', 'delivered') then
    raise exception 'Solo se pueden facturar órdenes listas o entregadas (estado actual: %)', v_order.status;
  end if;
  if exists (select 1 from public.invoices where order_id = p_order_id and status = 'issued') then
    raise exception 'Esta orden ya tiene una factura vigente';
  end if;

  insert into public.invoices (order_id, customer_id, subtotal, discount, tax_rate, tax, total)
  values (p_order_id, v_order.customer_id, v_order.subtotal, v_order.discount,
          v_order.tax_rate, v_order.tax, v_order.total)
  returning id into v_invoice_id;

  perform public.refresh_invoice_payment_status(p_order_id);
  return v_invoice_id;
end;
$$;

-- Los montos de una factura no se editan; solo se puede anular.
create function public.guard_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'void' then
    raise exception 'Una factura anulada no se puede modificar';
  end if;
  if (new.order_id, new.customer_id, new.number, new.issued_on, new.subtotal,
      new.discount, new.tax_rate, new.tax, new.total)
     is distinct from
     (old.order_id, old.customer_id, old.number, old.issued_on, old.subtotal,
      old.discount, old.tax_rate, old.tax, old.total) then
    raise exception 'Los datos de una factura no se pueden cambiar; anúlala y crea otra';
  end if;
  return new;
end;
$$;

create trigger guard_invoice
  before update on public.invoices
  for each row execute function public.guard_invoice();

create function public.on_payment_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.refresh_invoice_payment_status(coalesce(new.order_id, old.order_id));
  if tg_op = 'UPDATE' and new.order_id is distinct from old.order_id then
    perform public.refresh_invoice_payment_status(old.order_id);
  end if;
  return null;
end;
$$;

create trigger on_payment_change
  after insert or update or delete on public.payments
  for each row execute function public.on_payment_change();

-- ---------------------------------------------------------------------------
-- Aviso al sistema de comisiones cuando una factura queda pagada
-- ---------------------------------------------------------------------------

-- security definer: escribe en webhook_deliveries, que los usuarios no pueden tocar.
create function public.enqueue_invoice_paid_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if new.status = 'issued'
     and new.payment_status = 'paid'
     and (tg_op = 'INSERT' or old.payment_status is distinct from 'paid') then
    select * into v_order from public.orders where id = new.order_id;
    if v_order.source = 'commissions' then
      insert into public.webhook_deliveries (event, order_id, payload)
      values ('invoice.paid', new.order_id, jsonb_build_object(
        'event', 'invoice.paid',
        'external_ref', v_order.external_ref,
        'order_number', v_order.number,
        'invoice_number', new.number,
        'total', new.total,
        'amount_paid', (select coalesce(sum(p.amount), 0)
                          from public.payments p
                         where p.order_id = new.order_id),
        'paid_at', now()
      ));
    end if;
  end if;
  return null;
end;
$$;

create trigger enqueue_invoice_paid_webhook
  after insert or update of payment_status on public.invoices
  for each row execute function public.enqueue_invoice_paid_webhook();
