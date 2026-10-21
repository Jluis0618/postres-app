import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Los enlaces de los correos (invitación y "olvidé mi contraseña") llegan aquí con un código.
// Se cambia el código por una sesión y se sigue a "next" (por ejemplo, /cambiar-clave).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }
  return NextResponse.redirect(`${origin}/login?error=enlace`)
}
