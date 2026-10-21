import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Páginas que se ven sin sesión. La API tiene su propia llave y no usa la sesión.
const PUBLIC_PATHS = ["/login", "/auth/", "/cambiar-clave", "/api/", "/manifest.webmanifest", "/icons/", "/icon", "/apple-icon", "/sw.js", "/offline.html"]

// Refresca la sesión de Supabase en cada request y manda al login a quien no tenga sesión.
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
  const { data } = await supabase.auth.getClaims()

  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p))

  // Al redirigir se conservan las cookies de sesión que se acaban de refrescar.
  function redirectTo(pathname: string) {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ""
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!data?.claims && !isPublic) return redirectTo("/login")
  if (data?.claims && path === "/login") return redirectTo("/")

  return response
}
