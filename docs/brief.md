# Brief: sistema de gestión para el negocio de postres

> Estado: **borrador v0.1**. Las secciones marcadas con 💡 son propuestas por decidir.
> Las marcadas con ❓ son decisiones pendientes.

## 1. Contexto y objetivo

Un sistema para que mi mamá administre su empresa de postres desde un solo lugar:

- Saber qué postres y artículos tiene disponibles.
- Controlar el stock de ingredientes (harina, azúcar, etc.) y saber **cuándo tiene que ir a comprar**.
- Registrar órdenes con fecha de entrega y organizarse por día.
- Cotizar a clientes, facturar y ver cuánto ha vendido.

Más adelante se conectará con otro sistema que ya existe. Por ahora el objetivo es que esta parte quede lista y funcionando.

## 2. Usuarios

| Rol | Quién | Qué hace |
|-----|-------|----------|
| Administradora | Mamá | Todo: inventario, órdenes, cotizaciones, facturas, reportes |
| 💡 Ayudante (futuro) | Empleado/a | Ver órdenes del día y marcar avances, sin ver finanzas |

Al inicio hay **una sola usuaria**. El sistema debe ser simple y fácil de usar, sobre todo desde el celular.

## 3. Conceptos clave

- **Producto:** lo que se vende. Puede ser un postre (torta, cheesecake, galletas) o un artículo de venta (velas, toppers, cajas de regalo).
- **Insumo:** lo que se compra para producir, como harina, azúcar, huevos, mantequilla, empaques y cajas. Cada insumo tiene su unidad de medida (kg, g, L, ml, unidad).
- **💡 Receta:** cuántos insumos lleva un producto. Ejemplo: 1 torta de chocolate = 500 g harina + 300 g azúcar + 4 huevos + 1 caja. Es lo que conecta los dos inventarios.
- **Cliente:** persona o empresa que pide.
- **Cotización:** propuesta de precio que se le envía al cliente. Todavía no es una venta.
- **Orden:** pedido confirmado, con fecha de entrega.
- **Factura:** documento de cobro de una orden.

## 4. Flujo principal

```
Cotización ──(cliente acepta)──▶ Orden ──▶ Preparación ──▶ Entrega ──▶ Factura ──▶ Pago
   (opcional)                     │
                                  └─▶ reserva/descuenta insumos y productos
```

- Se puede crear una orden directamente, sin pasar por una cotización.
- Una cotización aceptada se convierte en orden con un clic, sin volver a escribir nada.
- Una orden entregada se factura con un clic.

## 5. Módulos del MVP

### 5.1 Inventario de productos
- Catálogo: nombre, categoría, precio de venta, foto (opcional), activo/inactivo.
- ✅ **Todo se trabaja bajo pedido**, pero a veces hay productos ya hechos. Por eso el stock de producto es **opcional**:
  - Por defecto, un producto no lleva stock y se produce cuando entra la orden.
  - Si hay unidades hechas, se registran como "disponibles" y la orden las toma primero.

### 5.2 Inventario de insumos
- Nombre, unidad, stock actual, **stock mínimo** y costo por unidad.
- Alerta cuando un insumo baja del mínimo.
- **Registro de compras:** entra mercancía, sube el stock y se actualiza el costo.
- Ajustes manuales con motivo (merma, se dañó, corrección de conteo).

### 5.3 Clientes
- Nombre, teléfono/WhatsApp, correo, dirección y datos fiscales (si se factura formalmente).
- Historial de órdenes por cliente.

### 5.4 Cotizaciones
- Cliente, productos, cantidades, precios, descuento, vigencia y notas.
- Estados: borrador → enviada → aceptada / rechazada / vencida.
- Generar **PDF** para enviar al cliente.
- Convertir en orden.

### 5.5 Órdenes
- Cliente, productos, **fecha y hora de entrega**, dirección o retiro, notas de personalización (por ejemplo "Feliz cumple Ana", sabor o color).
- Estados: pendiente → en preparación → lista → entregada (o cancelada).
- Vistas: **lista por fecha** y **calendario** (hoy, semana, mes).
- 💡 Anticipo o abono registrado en la orden.

### 5.6 Facturación
- Se genera desde una orden (o varias).
- Numeración consecutiva, impuestos, subtotal y total.
- PDF descargable o para enviar.
- Estado de pago: pendiente / parcial / pagada; método de pago.
- ✅ **Factura interna**, sin comprobante fiscal electrónico (e-NCF). Por ahora es un documento de control y cobro en PDF. El modelo debe permitir agregar el comprobante fiscal más adelante.

### 5.7 Ventas y reportes
- Ventas por día, semana y mes.
- Productos más vendidos.
- Ventas por cliente.
- Cuentas por cobrar (facturas sin pagar).

## 6. 💡 Funcionalidades propuestas

Para decidir cuáles entran al MVP y cuáles van después.

| # | Funcionalidad | Por qué sirve | ¿MVP? |
|---|---------------|---------------|-------|
| A | **Recetas + descuento automático de insumos** | Al marcar una orden "en preparación", se descuentan los ingredientes solos y no hay que contar a mano | ❓ |
| B | **Lista de compras inteligente** | Suma lo que piden las órdenes de los próximos días, lo compara con el stock y dice qué comprar y cuánto | ❓ |
| C | **Costeo y margen por producto** | Con la receta y el costo de los insumos, muestra cuánto cuesta hacer cada postre y cuánto se gana. Muchos negocios de postres venden por debajo del costo sin saberlo | ❓ |
| D | **Pantalla de inicio (dashboard)** | Al abrir: órdenes de hoy y mañana, alertas de stock bajo, ventas del mes y facturas por cobrar | ❓ |
| E | **Enviar cotización/factura por WhatsApp** | Un botón que abre WhatsApp con el mensaje y el link del PDF | ❓ |
| F | Anticipos / abonos | Común en tortas personalizadas | ❓ |
| G | Vencimiento de insumos | Avisa qué insumos están por vencer (crema, queso, frutas) | Después |
| H | Producción para vitrina | Registrar "hice 20 galletas": suma stock del producto y descuenta insumos | ❓ |
| I | Proveedores | Dónde se compra cada insumo y a qué precio | Después |
| J | Usuarios y roles | Para un ayudante | Después |
| K | API para integrar con el otro sistema | Dejarla diseñada desde el inicio, aunque se use después | Diseño sí, uso después |

## 7. Integración con el sistema de comisiones

**Contexto:** el usuario tiene un sistema propio que calcula las comisiones de lo que le vende a su mamá. Queremos agregarle un botón **"Hacer pedido"** que envíe la orden automáticamente a este sistema.

**Cómo funciona:**

```
Sistema de comisiones ──POST /api/v1/orders──▶ Sistema de postres
        ▲                                             │
        └────────(webhook: factura pagada)────────────┘
```

- **Entrada:** el sistema de comisiones llama a la API con el cliente, los productos, la fecha de entrega y las notas.
- **Autenticación:** API key secreta enviada en el header (`Authorization: Bearer ...`).
- La orden llega con **origen = "Sistema de comisiones"** y una **referencia externa** (el ID del pedido en el otro sistema), para que no se duplique si se reenvía.
- Llega en estado **"Por confirmar"**. Mamá la revisa y la acepta o la rechaza.
- **Catálogo:** `GET /api/v1/products` devuelve productos y precios, para que el otro sistema no tenga que copiarlos a mano.
- ✅ **Retorno:** la comisión se gana **cuando se paga**. Cuando la factura de una orden externa queda **pagada**, este sistema envía un webhook firmado al sistema de comisiones con la referencia externa, el monto pagado y la fecha.
  - Si el webhook falla, se reintenta y queda registrado.
  - Como respaldo, el sistema de comisiones puede consultar `GET /api/v1/orders/{id}` en cualquier momento.
- Los dos sistemas usan Next.js + Supabase, pero cada uno tiene **su propio proyecto de Supabase**. Se comunican solo por la API, así los datos del negocio de mamá quedan separados.

## 8. Fuera de alcance por ahora

- Contabilidad formal y comprobantes fiscales.
- Tienda online / pedidos hechos por el cliente.
- Contabilidad completa.
- Múltiples sucursales.

## 9. ❓ Decisiones pendientes

1. ~~Tipo de factura~~ ✅ **Decidido:** factura interna, sin e-NCF.
2. ✅ **Moneda:** pesos dominicanos (RD$). ❓ **ITBIS:** propuesta: configurable (activado/desactivado y tasa, por defecto 18%), apagado de inicio porque la factura es interna.
3. ✅ **Plataforma:** Next.js como **PWA** (ver sección 11).
4. ✅ **Base de datos y hosting:** Supabase (proyecto propio) + Vercel.
5. ✅ **El otro sistema:** el de comisiones, hecho en Next.js + Supabase; la comisión se gana al pagarse la factura (ver sección 7).
6. ✅ **Stock:** bajo pedido, con stock opcional.
7. **¿Cuándo se descuentan los insumos?** Propuesta: al pasar la orden a "en preparación".
8. ✅ **MVP:** incluye A (recetas + descuento automático), B (lista de compras), D (dashboard) y F (anticipos).

## 10. Fases propuestas

| Fase | Contenido | Resultado |
|------|-----------|-----------|
| 0 | Definir stack, estructura del proyecto, modelo de datos | Proyecto base corriendo |
| 1 | Productos, insumos, clientes | Ya puede cargar su catálogo e inventario |
| 2 | Órdenes + calendario + dashboard | Ya organiza su día a día |
| 3 | Cotizaciones + facturas + PDF | Ya cotiza y factura |
| 4 | Recetas, descuento automático, lista de compras, costeo | El inventario "se maneja solo" |
| 5 | Reportes de ventas | Sabe cuánto vende y gana |
| 6 | API de pedidos para el sistema de comisiones (sección 7) | Los pedidos le llegan solos |

## 11. Plataforma y stack

**Decidido:** **Next.js (App Router) como PWA**. Se instala en la tablet y el celular como si fuera una app, con su ícono en la pantalla de inicio y abriendo a pantalla completa. Funciona también desde la computadora.

Propuesta para el resto del stack (por confirmar):

| Pieza | Propuesta | Por qué |
|-------|-----------|---------|
| Lenguaje | TypeScript | Menos errores en datos como precios, cantidades y unidades |
| UI | Tailwind CSS + shadcn/ui | Componentes listos, botones grandes y fáciles de usar en pantalla táctil |
| Base de datos | ✅ PostgreSQL en **Supabase** | Lo mismo que el sistema de comisiones; datos relacionales; plan gratis suficiente |
| Acceso a datos | Cliente de Supabase + migraciones SQL (Supabase CLI) | Mismo flujo que ya conoces del otro sistema |
| Auth | ✅ Supabase Auth | Login simple para ella; listo para roles después |
| PDF | @react-pdf/renderer | Cotizaciones y facturas con su logo |
| PWA | Manifest + service worker (Serwist) | Instalable; caché de pantallas para que abra rápido |
| Hosting | Vercel | Deploy automático, plan gratis |
| API | Route handlers de Next (`/api/...`) | Base para integrar el otro sistema después |

**Offline:** la PWA abre aunque la señal sea mala, pero para crear órdenes y facturas necesita internet. El modo 100% offline con sincronización es mucho más complejo; lo dejamos para después si hace falta.

**Diseño pensado para tablet:** navegación con barra inferior o lateral, botones grandes, formularios cortos y búsqueda rápida de productos y clientes.
