# API para el sistema de comisiones

Tu sistema de comisiones manda pedidos aquí con el botón "Hacer pedido" y recibe un aviso cuando la factura de ese pedido queda pagada (ahí se gana la comisión).

Todas las llamadas llevan:

```
Authorization: Bearer <COMMISSIONS_API_KEY>
Content-Type: application/json
```

## Catálogo: `GET /api/v1/products`

```json
{
  "products": [
    { "id": "8f0c…", "name": "Torta de chocolate", "description": null, "price": 2500, "unit": "unidad", "category": "Tortas" }
  ]
}
```

Solo devuelve productos activos. Guarda el `id` para mandarlo en los pedidos.

## Crear pedido: `POST /api/v1/orders`

```json
{
  "external_ref": "COM-2057",
  "customer": { "name": "Laura Gómez", "phone": "849-555-0107", "email": "laura@correo.com", "address": "Naco" },
  "delivery_at": "2026-10-25T15:00:00-04:00",
  "delivery_type": "delivery",
  "delivery_address": "Naco, calle 3 #12",
  "notes": "Llamar al llegar",
  "items": [
    { "product_id": "8f0c…", "quantity": 1, "customization": "Feliz cumple Ana" },
    { "description": "Topper especial", "quantity": 1, "unit_price": 350 }
  ]
}
```

| Campo | Obligatorio | Nota |
|---|---|---|
| `external_ref` | Sí | El ID del pedido en tu sistema. No se puede repetir |
| `customer.name` | Sí | El cliente se reconoce por teléfono; si no existe, se crea |
| `delivery_at` | Sí | Fecha y hora ISO 8601. Usa `-04:00` (hora de RD) |
| `delivery_type` | No | `pickup` (por defecto) o `delivery` |
| `items[]` | Sí | Con `product_id` el precio y el nombre salen del catálogo. Sin `product_id`, manda `description` y `unit_price` |

Respuestas:

| Código | Cuándo | Cuerpo |
|---|---|---|
| `201` | Pedido creado | `{ "order": { "id", "number": "ORD-0031", "status": "pending_confirmation", "total" }, "duplicate": false }` |
| `200` | Ya existía ese `external_ref` (reenvío) | Lo mismo con `"duplicate": true`. No se crea otro |
| `400` | Faltan datos o un producto no existe | `{ "error": "…" }` |
| `401` | Llave incorrecta | `{ "error": "Llave inválida" }` |

El pedido llega como **Por confirmar**. Mamá lo confirma o lo rechaza desde la app.

## Consultar pedido: `GET /api/v1/orders/{external_ref}`

```json
{
  "order": {
    "external_ref": "COM-2057",
    "number": "ORD-0031",
    "status": "delivered",
    "delivery_at": "2026-10-25T19:00:00+00:00",
    "total": 2950,
    "amount_paid": 2950,
    "invoice": { "number": "FAC-0012", "payment_status": "paid", "total": 2950 }
  }
}
```

`status`: `pending_confirmation`, `pending`, `in_preparation`, `ready`, `delivered` o `cancelled`.
`payment_status`: `unpaid`, `partial` o `paid`. Sirve de respaldo por si un aviso no llegó.

## Aviso de pago (webhook)

Cuando la factura de un pedido tuyo queda **pagada**, se envía a `COMMISSIONS_WEBHOOK_URL`:

```
POST <COMMISSIONS_WEBHOOK_URL>
Content-Type: application/json
X-Signature: sha256=<hex>
X-Delivery-Id: <uuid>
```

```json
{
  "event": "invoice.paid",
  "external_ref": "COM-2057",
  "order_number": "ORD-0031",
  "invoice_number": "FAC-0012",
  "total": 2950,
  "amount_paid": 2950,
  "paid_at": "2026-10-25T20:14:03.512Z"
}
```

**Verificar la firma** (en tu sistema, Next.js):

```ts
import { createHmac, timingSafeEqual } from "node:crypto"

export async function POST(request: Request) {
  const body = await request.text()
  const expected = "sha256=" + createHmac("sha256", process.env.COMMISSIONS_WEBHOOK_SECRET!).update(body).digest("hex")
  const given = request.headers.get("x-signature") ?? ""
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return new Response("Firma inválida", { status: 401 })
  }
  const event = JSON.parse(body)
  // Marca la comisión de event.external_ref como ganada.
  // Responde 2xx rápido. Si el mismo X-Delivery-Id llega dos veces, ignóralo.
  return new Response("ok")
}
```

Si tu sistema no responde con `2xx`, se reintenta después de 1, 2, 4, 8… minutos (hasta 8 intentos). Los reintentos los dispara `/api/cron/webhooks` (ver puesta-en-marcha.md).
