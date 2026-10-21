import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Refresca la sesión de Supabase en cada request y guarda las cookies nuevas.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          // Evita que un CDN guarde en caché la sesión de un usuario.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  // No poner código entre createServerClient y getClaims():
  // getClaims() es lo que valida y refresca el token.
  await supabase.auth.getClaims()

  // Cuando exista la página de login, aquí redirigiremos a quien no tenga sesión.

  return response
}
