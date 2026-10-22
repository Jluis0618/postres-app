-- Stock de productos hechos: registrar producción con o sin descontar la receta.
--
-- Antes, register_production siempre descontaba los ingredientes y exigía que el producto
-- tuviera "maneja stock". Ahora:
--   - p_consume_supplies = false agrega al stock sin tocar los insumos (por ejemplo, si no hay
--     receta cargada, o si los ingredientes ya se descontaron de otra forma).
--   - Si el producto no llevaba stock, se activa solo al registrar producción.

drop function public.register_production(uuid, numeric);

create function public.register_production(
  p_product_id uuid,
  p_quantity numeric,
  p_consume_supplies boolean default true
)
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

  if p_consume_supplies then
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
  end if;

  if not v_product.track_stock then
    update public.products set track_stock = true where id = p_product_id;
  end if;

  insert into public.product_movements (product_id, type, quantity, notes)
  values (
    p_product_id,
    'production',
    p_quantity,
    case when p_consume_supplies then 'Producción' else 'Producción (sin descontar insumos)' end
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.register_production(uuid, numeric, boolean) from public, anon;
grant execute on function public.register_production(uuid, numeric, boolean) to authenticated, service_role;
