-- Correcciones de la revisión.

-- Las fechas "del día" se toman en hora de RD. Supabase corre en UTC, y una factura
-- hecha a las 9 pm salía con la fecha del día siguiente.
create function public.today_rd()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Santo_Domingo')::date
$$;

alter table public.invoices alter column issued_on set default public.today_rd();
alter table public.quotes alter column issued_on set default public.today_rd();
alter table public.purchases alter column purchased_on set default public.today_rd();

create or replace function public.record_purchase(p_purchase jsonb, p_items jsonb)
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
    coalesce(nullif(p_purchase ->> 'purchased_on', '')::date, public.today_rd()),
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

-- Reserva avisos pendientes para enviarlos, sin que dos envíos simultáneos tomen el mismo.
-- La reserva dura 2 minutos: si el envío se interrumpe, el aviso vuelve a quedar disponible.
create function public.claim_webhook_deliveries(p_limit int default 20, p_id uuid default null)
returns table (id uuid, payload jsonb, attempts int)
language sql
set search_path = ''
as $$
  update public.webhook_deliveries w
     set next_attempt_at = now() + interval '2 minutes'
   where w.id in (
     select d.id
       from public.webhook_deliveries d
      where d.status = 'pending'
        and (p_id is null or d.id = p_id)
        and (p_id is not null or d.next_attempt_at <= now())
      order by d.next_attempt_at
      limit p_limit
        for update skip locked
   )
  returning w.id, w.payload, w.attempts
$$;

revoke execute on function public.claim_webhook_deliveries(int, uuid) from public, anon, authenticated;
revoke execute on function public.today_rd() from public, anon;
grant execute on function public.today_rd() to authenticated;
