# Sistema de postres

Órdenes, inventario (productos e insumos con recetas), cotizaciones, facturas, pagos y reportes para el negocio de postres. Se instala en la tablet y el celular como app (PWA) y recibe pedidos del sistema de comisiones.

**Hecho con:** Next.js 16 · Supabase (Postgres, Auth, RLS) · Tailwind + shadcn/ui.

## Documentación

| Archivo | Qué explica |
|---|---|
| [docs/puesta-en-marcha.md](docs/puesta-en-marcha.md) | Crear la base, configurar Supabase, variables, publicar e instalar |
| [docs/api-comisiones.md](docs/api-comisiones.md) | API y avisos para el sistema de comisiones |
| [docs/modelo-datos.md](docs/modelo-datos.md) | Tablas, reglas del negocio y funciones de la base |
| [docs/brief.md](docs/brief.md) | La idea original y las decisiones |

## Comandos

```bash
npm run dev       # la app en http://localhost:3000
npm run test:db   # prueba las migraciones en un Postgres temporal (sin Docker)
npm run build     # compilación de producción
npx supabase db push   # aplica migraciones nuevas a Supabase
```

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `src/app/(app)/` | Pantallas internas (con menú) |
| `src/app/login`, `cambiar-clave`, `auth/callback` | Entrar y recuperar contraseña |
| `src/app/actions/` | Acciones que guardan datos (las llaman los botones) |
| `src/app/api/` | API del sistema de comisiones y reintentos de avisos |
| `src/lib/data.ts` | Consultas de lectura |
| `src/lib/format.ts` | Dinero, cantidades y fechas en hora de RD |
| `supabase/migrations/` | La base de datos en SQL |
| `supabase/tests/` | Prueba automática de la base |
