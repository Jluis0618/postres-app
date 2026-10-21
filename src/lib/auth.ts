import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

/** Usuario con sesión y su perfil, o null. Se calcula una vez por request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (!id) return null
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>()
  return { id, email: (data.claims.email as string | undefined) ?? null, profile }
})

/** Para pantallas internas: sin sesión va al login; sin rol, a "sin acceso". */
export async function requireStaff() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!user.profile?.role) redirect("/sin-acceso")
  return { ...user, role: user.profile.role, name: user.profile.name ?? user.email ?? "Usuario" }
}

/** Reportes y configuración: solo la administradora. */
export async function requireAdmin() {
  const user = await requireStaff()
  if (user.role !== "admin") redirect("/")
  return user
}
