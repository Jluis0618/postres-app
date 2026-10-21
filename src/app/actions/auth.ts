"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

export async function signIn(email: string, password: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    return { ok: false, error: error.message.includes("Invalid") ? "Correo o contraseña incorrectos." : error.message }
  }
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/** Envía un correo con un enlace para crear una contraseña nueva. */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const supabase = await createClient()
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/auth/callback?next=/cambiar-clave`,
  })
  // No decimos si el correo existe o no, por seguridad.
  if (error && !error.message.toLowerCase().includes("not found")) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updatePassword(password: string): Promise<ActionResult> {
  if (password.length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
