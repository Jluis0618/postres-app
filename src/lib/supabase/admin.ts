import "server-only"
import { createClient } from "@supabase/supabase-js"

// Cliente con la llave secreta: salta los permisos (RLS). Solo para el servidor:
// la API del sistema de comisiones, el envío de avisos y las invitaciones de usuarios.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) {
    throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno")
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
