# Modelo de datos

> Estado: **v0.2**, aprobado en lo principal. Todavía no está creado en Supabase.

## Convenciones

- Tablas, columnas y valores de enums en **inglés**, `snake_case`, tablas en plural (igual que el sistema de comisiones). La interfaz se muestra en español: por ejemplo, `in_preparation` se ve como "En preparación".
- Los números de documento que ve el cliente siguen en español: `COT-0001`, `ORD-0001`, `FAC-0001`.
- Todas las tablas tienen `id uuid` (PK), `created_at` y `updated_at`.
- **Dinero:** `numeric(12,2)` en RD$. **Cantidades:** `numeric(12,3)`, porque hay gramos con decimales.
- **Unidades de insumos:** se guardan en unidad base: `g`, `ml` o `unit`. En pantalla se puede escribir en kg o L y el sistema convierte (2 kg → 2000 g).
- **Stock:** nunca se edita a mano. Todo cambio pasa por un **movimiento** (compra, consumo, ajuste, merma) y un trigger actualiza el stock. Así siempre se sabe por qué cambió.
- **Seguridad (RLS):** activado en todas las tablas. Por ahora cualquier usuario autenticado tiene acceso total, porque la única usuaria es mamá. La API externa entra por el servidor con su propia llave.

## Glosario

| Español | Tabla |
|---|---|
| Configuración | `settings` |
| Perfiles | `profiles` |
| Categorías | `categories` |
| Productos | `products` |
| Insumos (ingredientes y empaques) | `supplies` |
| Receta | `recipe_items` |
| Compras | `purchases`, `purchase_items` |
| Movimientos de inventario | `supply_movements`, `product_movements` |
| Clientes | `customers` |
| Cotizaciones | `quotes`, `quote_items` |
| Órdenes | `orders`, `order_items` |
| Facturas | `invoices` |
| Pagos y anticipos | `payments` |
| Avisos al sistema de comisiones | `webhook_deliveries` |

## Tablas

### Configuración y usuarios

**`settings`** (una sola fila)
| Columna | Tipo | Nota |
|---|---|---|
| business_name, phone, address, tax_id | text | Datos que salen en los PDF (`tax_id` = RNC) |
| logo_url | text | |
| itbis_enabled | boolean | Por defecto `false` |
| itbis_rate | numeric(5,2) | Por defecto `18.00` |
| invoice_note, quote_note | text | Texto al pie de los PDF |
| quote_validity_days | int | Por defecto `15` |

**`profiles`**: `id` (= `auth.users.id`), `name`, `role` (`admin` \| `assistant`). Preparada para cuando haya ayudante.

### Catálogo e inventario

**`categories`**: `name`, `sort_order`. Agrupa productos (Tortas, Galletas, Postres fríos, Artículos).

**`products`**
| Columna | Tipo | Nota |
|---|---|---|
| name, description | text | |
| category_id | FK → categories | |
| price | numeric(12,2) | Precio de venta |
| unit | text | `unidad`, `docena`, `porción`… (texto que ve el cliente) |
| photo_url | text | |
| track_stock | boolean | `false` = solo bajo pedido |
| stock_available | numeric(12,3) | Unidades ya hechas; lo actualiza un trigger |
| recipe_yield | numeric(12,3) | Cuántas unidades salen de la receta (ej. receta de galletas = 24) |
| is_active | boolean | |

**`supplies`** (insumos)
| Columna | Tipo | Nota |
|---|---|---|
| name | text | Harina, azúcar, huevos, caja 10×10… |
| unit | enum `g` \| `ml` \| `unit` | Unidad base |
| stock_on_hand | numeric(12,3) | Lo actualiza un trigger. Nunca negativo (`check >= 0`) |
| min_stock | numeric(12,3) | Debajo de esto, alerta |
| unit_cost | numeric(12,4) | Costo por unidad base; promedio ponderado al registrar compras |
| supplier, notes | text | |
| is_active | boolean | |

**`recipe_items`**: `product_id`, `supply_id`, `quantity`. Ejemplo: Torta de chocolate (rinde 1) → 500 g harina, 300 g azúcar, 4 huevos, 1 caja.

**`purchases`**: `purchased_on`, `supplier`, `total`, `notes`.
**`purchase_items`**: `purchase_id`, `supply_id`, `quantity`, `total_cost`. Al guardar, crea un movimiento de entrada y recalcula el costo del insumo.

**`supply_movements`** (historial de insumos)
| Columna | Tipo | Nota |
|---|---|---|
| supply_id | FK | |
| type | enum `purchase` \| `order_consumption` \| `order_return` \| `production` \| `adjustment` \| `waste` | `waste` = merma |
| quantity | numeric(12,3) | Positiva = entra, negativa = sale |
| unit_cost | numeric(12,4) | Costo en ese momento |
| order_id, purchase_id | FK opcionales | De dónde vino |
| notes | text | Motivo del ajuste o merma |

**`product_movements`**: igual, pero para productos hechos. `type` = `production` \| `order_sale` \| `order_return` \| `adjustment` \| `waste`.

### Ventas

**`customers`**: `name`, `phone`, `email`, `address`, `tax_id`, `notes`, `is_active`.

**`quotes`** (cotizaciones)
| Columna | Tipo | Nota |
|---|---|---|
| number | text único | `COT-0001` |
| customer_id | FK | |
| issued_on, valid_until | date | |
| status | enum `draft` \| `sent` \| `accepted` \| `rejected` \| `expired` | |
| subtotal, discount, tax, total | numeric(12,2) | `tax` = ITBIS |
| notes | text | |
| order_id | FK opcional | La orden creada al aceptarla |

**`quote_items`**: `quote_id`, `product_id` (opcional, para ítems especiales), `description`, `quantity`, `unit_price`, `total`.

**`orders`**
| Columna | Tipo | Nota |
|---|---|---|
| number | text único | `ORD-0001` |
| customer_id | FK | |
| quote_id | FK opcional | Si vino de una cotización |
| delivery_at | timestamptz | Fecha y hora de entrega |
| delivery_type | enum `pickup` \| `delivery` | Retiro o envío |
| delivery_address | text | |
| status | enum `pending_confirmation` \| `pending` \| `in_preparation` \| `ready` \| `delivered` \| `cancelled` | |
| source | enum `manual` \| `commissions` | `commissions` = vino del sistema de comisiones |
| external_ref | text | ID del pedido en el sistema de comisiones; único junto con `source` para evitar duplicados |
| subtotal, discount, tax, total | numeric(12,2) | |
| notes | text | |

**`order_items`**: `order_id`, `product_id`, `description`, `quantity`, `unit_price`, `total`, `customization` ("Feliz cumple Ana", sabor, color), `qty_from_stock` (cuántas se tomaron de lo ya hecho).

**`invoices`** (facturas)
| Columna | Tipo | Nota |
|---|---|---|
| number | text único | `FAC-0001` |
| order_id | FK **único** | 1 factura = 1 orden: la orden se convierte en factura |
| customer_id | FK | |
| issued_on | date | |
| subtotal, discount, tax, total | numeric(12,2) | Copiados de la orden al facturar |
| status | enum `issued` \| `void` | Emitida o anulada |
| payment_status | enum `unpaid` \| `partial` \| `paid` | Lo calcula un trigger a partir de los pagos |
| ncf | text opcional | Vacío por ahora; listo para comprobante fiscal futuro |

**`payments`**: `order_id`, `amount`, `method` (`cash` \| `transfer` \| `card` \| `other`), `paid_at`, `reference`, `notes`. Los pagos van a la **orden**, así un **anticipo** se registra antes de que exista la factura. Al facturar, la factura toma en cuenta lo ya abonado.

### Integración

**`webhook_deliveries`** (cola de avisos al sistema de comisiones): `event` (`invoice.paid`), `order_id`, `payload` jsonb, `status` (`pending` \| `sent` \| `failed`), `attempts`, `last_error`, `sent_at`.

La API key del sistema de comisiones va en una variable de entorno del servidor, no en la base de datos.

## Lo que se calcula (vistas y funciones, no tablas)

| Nombre | Qué devuelve | Para |
|---|---|---|
| `product_costs` (vista) | Costo de cada producto según su receta, y su margen | Funcionalidad C |
| `low_stock_supplies` (vista) | Insumos con `stock_on_hand < min_stock` | Dashboard |
| `shopping_list(days)` | Insumos que necesitan las órdenes de los próximos N días, menos el stock actual = qué comprar | Funcionalidad B |
| `start_order_preparation(order_id)` | Pasa la orden a `in_preparation`: toma primero el stock hecho y descuenta insumos por receta para el resto, en una sola transacción. Si falta algo, no hace nada y devuelve la lista de faltantes | Funcionalidad A |
| `cancel_order(order_id, waste)` | Cancela la orden, devuelve los insumos y registra como merma solo lo indicado | Regla 3 |
| `register_production(product_id, qty)` | "Hice 20 galletas": suma stock del producto y descuenta insumos | Stock opcional |
| `sales_*` (vistas) | Ventas por día/mes, por producto, por cliente | Reportes |

## Reglas de negocio

1. Al pasar una orden a **en preparación** (`in_preparation`), se descuentan los insumos.
2. **El stock de insumos nunca queda negativo.** Si no alcanza para preparar una orden, el sistema **no la deja pasar a "en preparación"** y le muestra qué falta y cuánto (ej. "Faltan 300 g de harina"). Desde esa alerta puede registrar la compra o corregir el conteo y seguir.
3. Si una orden **en preparación** se cancela, los insumos **se devuelven al inventario** por defecto. Solo lo que ya se usó y no se puede recuperar (masa hecha, bizcocho horneado) se puede marcar como **merma** (`waste`).
4. La orden **se convierte en factura** (una factura por orden). Solo se permite con la orden en `ready` o `delivered`.
5. Cuando el `payment_status` de una factura de origen `commissions` pasa a `paid`, se crea un registro en `webhook_deliveries`.
6. Los precios se **copian** a la orden y a la factura. Si mañana cambia el precio de un producto, lo ya vendido no cambia.
