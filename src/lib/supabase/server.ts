import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Se crea uno nuevo en cada request; nunca se reutiliza entre usuarios.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Los Server Components no pueden escribir cookies.
            // No pasa nada: el proxy ya refresca la sesión en cada request.
          }
        },
      },
    }
  )
}
