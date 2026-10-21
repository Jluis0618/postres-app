-- Inventario: el stock solo cambia a través de movimientos.
--
-- Banderas de transacción usadas por estos triggers:
--   app.stock_sync        = 'on' mientras un movimiento actualiza el stock
--   app.skip_stock_apply  = 'on' para registrar un movimiento sin volver a aplicarlo
--                           (stock inicial que ya viene en la fila nueva)

-- ---------------------------------------------------------------------------
-- Insumos
-- ---------------------------------------------------------------------------

create function public.apply_supply_movement()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_supply public.supplies;
begin
  if current_setting('app.skip_stock_apply', true) = 'on' then
    return new;
  end if;

  select * into v_supply from public.supplies where id = new.supply_id for update;
  if v_supply.stock_on_hand + new.quantity < 0 then
    raise exception 'No hay suficiente %: hay % %, se necesitan % %',
      v_supply.name, v_supply.stock_on_hand, v_supply.unit, -new.quantity, v_supply.unit;
  end if;

  perform set_config('app.stock_sync', 'on', true);
  update public.supplies
     set stock_on_hand = stock_on_hand + new.quantity
   where id = new.supply_id;
  perform set_config('app.stock_sync', 'off', true);

  return new;
end;
$$;

create trigger apply_supply_movement
  after insert on public.supply_movements
  for each row execute function public.apply_supply_movement();

create function public.guard_supply_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stock_on_hand is distinct from old.stock_on_hand
     and current_setting('app.stock_sync', true) is distinct from 'on' then
    raise exception 'El stock de insumos solo cambia con movimientos (compra, ajuste, merma)';
  end if;
  return new;
end;
$$;

create trigger guard_supply_stock
  before update on public.supplies
  for each row execute function public.guard_supply_stock();

-- Si un insumo se crea con stock, queda registrado como "Stock inicial".
create function public.record_initial_supply_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stock_on_hand > 0 then
    perform set_config('app.skip_stock_apply', 'on', true);
    insert into public.supply_movements (supply_id, type, quantity, unit_cost, notes)
    values (new.id, 'adjustment', new.stock_on_hand, new.unit_cost, 'Stock inicial');
    perform set_config('app.skip_stock_apply', 'off', true);
  end if;
  return new;
end;
$$;

create trigger record_initial_supply_stock
  after insert on public.supplies
  for each row execute function public.record_initial_supply_stock();

-- ---------------------------------------------------------------------------
-- Productos hechos
-- ---------------------------------------------------------------------------

create function public.apply_product_movement()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_product public.products;
begin
  if current_setting('app.skip_stock_apply', true) = 'on' then
    return new;
  end if;

  select * into v_product from public.products where id = new.product_id for update;
  if v_product.stock_available + new.quantity < 0 then
    raise exception 'No hay suficiente % hecho: hay %, se necesitan %',
      v_product.name, v_product.stock_available, -new.quantity;
  end if;

  perform set_config('app.stock_sync', 'on', true);
  update public.products
     set stock_available = stock_available + new.quantity
   where id = new.product_id;
  perform set_config('app.stock_sync', 'off', true);

  return new;
end;
$$;

create trigger apply_product_movement
  after insert on public.product_movements
  for each row execute function public.apply_product_movement();

create function public.guard_product_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stock_available is distinct from old.stock_available
     and current_setting('app.stock_sync', true) is distinct from 'on' then
    raise exception 'El stock de productos solo cambia con movimientos (producción, venta, ajuste, merma)';
  end if;
  return new;
end;
$$;

create trigger guard_product_stock
  before update on public.products
  for each row execute function public.guard_product_stock();

create function public.record_initial_product_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stock_available > 0 then
    perform set_config('app.skip_stock_apply', 'on', true);
    insert into public.product_movements (product_id, type, quantity, notes)
    values (new.id, 'adjustment', new.stock_available, 'Stock inicial');
    perform set_config('app.skip_stock_apply', 'off', true);
  end if;
  return new;
end;
$$;

create trigger record_initial_product_stock
  after insert on public.products
  for each row execute function public.record_initial_product_stock();

-- ---------------------------------------------------------------------------
-- Compras: suben el stock y recalculan el costo (promedio ponderado)
-- ---------------------------------------------------------------------------

create function public.apply_purchase_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_supply public.supplies;
begin
  select * into v_supply from public.supplies where id = new.supply_id for update;

  update public.supplies
     set unit_cost = round(
           (v_supply.stock_on_hand * v_supply.unit_cost + new.total_cost)
           / (v_supply.stock_on_hand + new.quantity), 4)
   where id = new.supply_id;

  insert into public.supply_movements (supply_id, type, quantity, unit_cost, purchase_id)
  values (new.supply_id, 'purchase', new.quantity,
          round(new.total_cost / new.quantity, 4), new.purchase_id);

  update public.purchases
     set total = total + new.total_cost
   where id = new.purchase_id;

  return new;
end;
$$;

create trigger apply_purchase_item
  after insert on public.purchase_items
  for each row execute function public.apply_purchase_item();

-- ---------------------------------------------------------------------------
-- Recetas y producción
-- ---------------------------------------------------------------------------

-- Insumos que se necesitan para hacer p_units unidades de un producto.
create function public.recipe_requirements(p_product_id uuid, p_units numeric)
returns table (supply_id uuid, quantity numeric)
language sql
stable
set search_path = ''
as $$
  select ri.supply_id, ri.quantity * p_units / p.recipe_yield
    from public.recipe_items ri
    join public.products p on p.id = ri.product_id
   where ri.product_id = p_product_id
     and p_units > 0
$$;

-- "Hice 20 galletas": suma stock del producto y descuenta insumos.
-- Si falta algún insumo no cambia nada y devuelve { ok: false, missing: [...] }.
create function public.register_production(p_product_id uuid, p_quantity numeric)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_product public.products;
  v_missing jsonb;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;
  if not v_product.track_stock then
    raise exception 'Activa "maneja stock" en % para registrar producción', v_product.name;
  end if;

  perform 1
     from public.supplies s
    where s.id in (select r.supply_id from public.recipe_requirements(p_product_id, p_quantity) r)
      for update;

  select jsonb_agg(jsonb_build_object(
           'supply_id', s.id,
           'name', s.name,
           'unit', s.unit,
           'required', round(r.quantity, 3),
           'available', s.stock_on_hand,
           'missing', round(r.quantity, 3) - s.stock_on_hand
         ) order by s.name)
    into v_missing
    from public.recipe_requirements(p_product_id, p_quantity) r
    join public.supplies s on s.id = r.supply_id
   where round(r.quantity, 3) > s.stock_on_hand;

  if v_missing is not null then
    return jsonb_build_object('ok', false, 'missing', v_missing);
  end if;

  insert into public.supply_movements (supply_id, type, quantity, unit_cost, notes)
  select r.supply_id, 'production', -round(r.quantity, 3), s.unit_cost,
         format('Producción: %s × %s', p_quantity, v_product.name)
    from public.recipe_requirements(p_product_id, p_quantity) r
    join public.supplies s on s.id = r.supply_id
   where round(r.quantity, 3) > 0;

  insert into public.product_movements (product_id, type, quantity, notes)
  values (p_product_id, 'production', p_quantity, 'Producción');

  return jsonb_build_object('ok', true);
end;
$$;
