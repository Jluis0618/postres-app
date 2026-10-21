import { NextResponse } from "next/server"
import { hasBearer } from "@/lib/api-auth"
import { deliverPendingWebhooks } from "@/lib/webhooks"

// Reintenta los avisos pendientes al sistema de comisiones.
// Llamarlo cada 5 minutos (cron de Vercel o Cloudflare) con "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  if (!hasBearer(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    return NextResponse.json(await deliverPendingWebhooks())
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 })
  }
}

export const POST = GET
