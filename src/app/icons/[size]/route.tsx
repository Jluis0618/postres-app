import type { NextRequest } from "next/server"
import { appIcon } from "@/lib/app-icon"

// Íconos del manifest: /icons/192, /icons/512 y /icons/maskable-512.
export async function GET(_request: NextRequest, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params
  const maskable = size.startsWith("maskable-")
  const px = Number(size.replace("maskable-", ""))
  if (![192, 512].includes(px)) return new Response("Not found", { status: 404 })
  return appIcon(px, { maskable })
}
