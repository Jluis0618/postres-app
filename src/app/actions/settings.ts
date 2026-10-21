"use server"

import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { deliverPendingWebhooks } from "@/lib/webhooks"
import type { Settings, UserRole } from "@/lib/types"
import { must, run, sessionClient } from "./helpers"

export async function updateSettings(input: Omit<Settings, "logo_url">) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!input.business_name.trim()) throw new Error("Escribe el nombre del negocio")
    // Solo la administradora puede; la base de datos lo verifica (RLS).
    const data = must(await supabase.from("settings").update(input).eq("id", 1).select("id"))
    if (!data?.length) throw new Error("No tienes permiso para cambiar la configuración.")
  })
}

export async function setUserRole(userId: string, role: UserRole | null) {
  return run(async () => {
    const supabase = await sessionClient()
    const { data: me } = await supabase.auth.getClaims()
    if (me?.claims?.sub === userId) throw new Error("No puedes cambiar tus propios permisos.")
    const data = must(await supabase.from("profiles").update({ role }).eq("id", userId).select("id"))
    if (!data?.length) throw new Error("No tienes permiso para cambiar usuarios.")
  })
}

/** Invita por correo. Necesita SUPABASE_SECRET_KEY en el servidor. */
export async function inviteUser(email: string, role: UserRole) {
  return run(async () => {
    const supabase = await sessionClient()
    const { data: isAdmin } = await supabase.rpc("is_admin")
    if (!isAdmin) throw new Error("Solo la administradora puede invitar usuarios.")

    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? ""
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback?next=/cambiar-clave`,
    })
    if (error) throw new Error(error.message.includes("already") ? "Ese correo ya tiene cuenta." : error.message)
    must(await admin.from("profiles").update({ role }).eq("id", data.user.id))
  })
}

export async function retryWebhook(deliveryId: string) {
  return run(async () => {
    const supabase = await sessionClient()
    const { data: isAdmin } = await supabase.rpc("is_admin")
    if (!isAdmin) throw new Error("Solo la administradora puede reenviar avisos.")
    const admin = createAdminClient()
    must(await admin.from("webhook_deliveries").update({ status: "pending", next_attempt_at: new Date().toISOString() }).eq("id", deliveryId))
    const result = await deliverPendingWebhooks({ onlyId: deliveryId })
    if ("skipped" in result) throw new Error(result.skipped)
    if (result.failed) throw new Error("Tu sistema no respondió. Se volverá a intentar automáticamente.")
  })
}
