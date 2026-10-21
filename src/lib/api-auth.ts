import "server-only"
import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

/** Compara el header "Authorization: Bearer <llave>" con la llave esperada sin filtrar tiempos. */
export function hasBearer(request: Request, expected: string | undefined) {
  if (!expected) return false
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Respuesta 401 si el sistema de comisiones no manda la llave correcta; null si está bien. */
export function requireApiKey(request: Request) {
  if (!process.env.COMMISSIONS_API_KEY) {
    return NextResponse.json({ error: "La API no está configurada (falta COMMISSIONS_API_KEY)" }, { status: 503 })
  }
  if (!hasBearer(request, process.env.COMMISSIONS_API_KEY)) {
    return NextResponse.json({ error: "Llave inválida" }, { status: 401 })
  }
  return null
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
