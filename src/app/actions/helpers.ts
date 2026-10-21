import "server-only"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

/** Cliente con la sesión del usuario; falla con un mensaje claro si no hay sesión. */
export async function sessionClient() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) throw new SessionError()
  return supabase
}

class SessionError extends Error {}

/** Traduce los errores de Postgres que no vienen ya en español. */
export function fail(error: unknown): ActionResult<never> {
  if (error instanceof SessionError) return { ok: false, error: "Tu sesión expiró. Vuelve a entrar." }
  const e = error as { message?: string; code?: string }
  const message = e?.message ?? "Algo salió mal"
  if (e?.code === "23505") return { ok: false, error: "Ya existe un registro con esos datos." }
  if (e?.code === "42501" || message.includes("row-level security")) return { ok: false, error: "No tienes permiso para hacer esto." }
  if (e?.code === "23503") return { ok: false, error: "No se puede, porque otros registros dependen de este." }
  return { ok: false, error: message }
}

/** Las páginas leen de la base en cada visita; esto refresca la que se está viendo. */
export function refreshAll() {
  revalidatePath("/", "layout")
}

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    refreshAll()
    return { ok: true, data }
  } catch (error) {
    return fail(error)
  }
}

/** Lanza el error de Supabase si lo hay, y devuelve los datos. */
export function must<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error
  return result.data
}
