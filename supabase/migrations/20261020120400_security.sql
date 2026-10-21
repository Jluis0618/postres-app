-- Usuarios y permisos (Row Level Security).
--
-- Quién entra:
--   - El primer usuario que se registre queda como admin (mamá).
--   - Cualquier otro usuario queda SIN acceso (role = null) hasta que un admin le asigne rol.
--   - Además, hay que desactivar el registro público en Supabase (Auth → Sign In / Providers).

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    case when exists (select 1 from public.profiles) then null else 'admin'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role is not null
  )
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  -- RLS en todas las tablas.
  foreach t in array array[
    'settings', 'profiles', 'categories', 'products', 'supplies', 'recipe_items',
    'purchases', 'purchase_items', 'customers', 'quotes', 'quote_items', 'orders',
    'order_items', 'invoices', 'payments', 'supply_movements', 'product_movements',
    'webhook_deliveries'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Acceso completo para el equipo.
  foreach t in array array[
    'categories', 'products', 'supplies', 'recipe_items', 'purchases', 'customers',
    'quotes', 'quote_items', 'orders', 'order_items', 'payments'
  ] loop
    execute format(
      'create policy "staff full access" on public.%I
         for all to authenticated
         using ((select public.is_staff()))
         with check ((select public.is_staff()))', t);
  end loop;

  -- Historial: se lee y se agrega, nunca se edita ni se borra.
  foreach t in array array['purchase_items', 'supply_movements', 'product_movements'] loop
    execute format(
      'create policy "staff read" on public.%I
         for select to authenticated using ((select public.is_staff()))', t);
    execute format(
      'create policy "staff insert" on public.%I
         for insert to authenticated with check ((select public.is_staff()))', t);
  end loop;
end;
$$;

-- Facturas: se crean y se anulan, nunca se borran.
create policy "staff read" on public.invoices
  for select to authenticated using ((select public.is_staff()));
create policy "staff insert" on public.invoices
  for insert to authenticated with check ((select public.is_staff()));
create policy "staff update" on public.invoices
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- Configuración: todos la leen, solo admin la cambia.
create policy "staff read" on public.settings
  for select to authenticated using ((select public.is_staff()));
create policy "admin update" on public.settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Perfiles: cada quien ve el suyo; admin ve y edita todos.
create policy "own or admin read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "admin update" on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Webhooks: solo lectura. Los escribe un trigger y los envía el servidor.
create policy "staff read" on public.webhook_deliveries
  for select to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Permisos de anon (sin sesión): ninguno
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
