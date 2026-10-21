# Puesta en marcha

Pasos para dejar la app funcionando, en orden. Los que dicen **(una vez)** no se repiten.

## 1. Base de datos en Supabase (una vez)

Desde la carpeta `postres-app`:

```bash
npx supabase login
npx supabase link --project-ref ofyiaztgwhvtxubbenqp
npx supabase db push
```

- `login` abre el navegador.
- `link` pide la contraseña de la base de datos (la que guardaste al crear el proyecto).
- `db push` crea las tablas, las reglas y las funciones (7 migraciones). Confirma con `Y`.

Cada vez que agreguemos una migración nueva, se vuelve a correr solo `npx supabase db push`.

## 2. Configurar Supabase (una vez)

En https://supabase.com/dashboard → tu proyecto:

1. **Authentication → Users → Add user → Create new user**: crea el usuario de tu mamá con su correo y una contraseña.
   **Tiene que ser el primero**: el primer usuario queda como administradora. Marca "Auto Confirm User".
2. **Authentication → Sign In / Providers**: apaga **Allow new users to sign up**. Así nadie más puede crearse una cuenta; a los demás se les invita desde Configuración.
3. **Authentication → URL Configuration**:
   - **Site URL**: la dirección de la app publicada (por ejemplo `https://postres.tudominio.com`). Mientras pruebas: `http://localhost:3000`.
   - **Redirect URLs**: agrega `http://localhost:3000/**` y `https://TU-DOMINIO/**`. Sin esto, los enlaces de "olvidé mi contraseña" y de invitación no funcionan.
4. **Project Settings → API Keys**: copia la **secret key** (`sb_secret_...`) para el paso 3.

## 3. Variables de entorno

Copia `.env.example` como `.env.local` y llénalo. En el hosting, pon las mismas variables en su panel.

| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dirección del proyecto | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Llave pública | Sí |
| `SUPABASE_SECRET_KEY` | API de comisiones, avisos e invitaciones. **Nunca** con `NEXT_PUBLIC_` | Sí, para la integración |
| `NEXT_PUBLIC_APP_NAME` | Nombre en el login y en el ícono instalado | No (por defecto "Dulces de Mamá") |
| `NEXT_PUBLIC_SITE_URL` | Dirección pública, para los correos | Recomendada |
| `COMMISSIONS_API_KEY` | La llave que manda tu sistema de comisiones | Para la integración |
| `COMMISSIONS_WEBHOOK_URL` | Dónde tu sistema recibe "factura pagada" | Para la integración |
| `COMMISSIONS_WEBHOOK_SECRET` | Firma de los avisos | Para la integración |
| `CRON_SECRET` | Protege la ruta de reintentos de avisos | Para la integración |

Para generar llaves largas y aleatorias:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Probar en tu computadora

```bash
npm run dev
```

Abre http://localhost:3000 y entra con el usuario de tu mamá. Lo primero que conviene cargar:

1. **Configuración**: nombre del negocio, RNC, teléfono, notas de las facturas.
2. **Inventario → Insumos**: harina, azúcar, huevos, empaques… con lo que hay hoy y el mínimo.
3. **Inventario → Productos**: cada postre con su precio y su receta.
4. **Clientes** (o se crean al vuelo desde Nueva orden).

## 5. Publicar

La app es un proyecto Next.js normal. Dos opciones:

**Vercel** (lo más simple; para un negocio corresponde el plan Pro según sus términos):
1. Sube el proyecto a GitHub.
2. En vercel.com → Add New Project → elige el repositorio. **Root Directory**: `postres-app`.
3. Pega las variables de entorno del paso 3. Deploy.

**Cloudflare** (plan gratis que permite uso comercial): usa el adaptador OpenNext (`@opennextjs/cloudflare`). Requiere un poco más de configuración; se puede hacer cuando decidas publicar ahí.

Después de publicar, actualiza **Site URL** y **Redirect URLs** en Supabase (paso 2.3) con la dirección real.

### Reintentos de avisos (cron)

Los avisos de "factura pagada" salen enseguida al registrar el pago. Si tu sistema no responde, quedan en cola. Para reintentarlos, programa una llamada cada 5 minutos a:

```
GET https://TU-DOMINIO/api/cron/webhooks
Authorization: Bearer <CRON_SECRET>
```

Sirve cualquier servicio de cron (por ejemplo cron-job.org, gratis) o el cron de tu hosting. También se pueden reenviar a mano en Configuración → Sistema de comisiones.

## 6. Instalar en la tablet y el celular

Abre la dirección publicada:
- **Android (Chrome)**: aparece "Instalar app", o menú ⋮ → *Instalar aplicación*.
- **iPhone/iPad (Safari)**: Compartir → *Agregar a pantalla de inicio*.

Para que se pueda instalar, la app tiene que estar publicada con `https` (en `localhost` no aparece el botón en todos los celulares).
