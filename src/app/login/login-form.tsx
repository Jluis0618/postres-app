"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Solo diseño: entra directo a la app. Con Supabase usará supabase.auth.signInWithPassword.
export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => router.push("/"), 600)
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" type="email" autoComplete="email" className="h-12" placeholder="tu@correo.com" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <button type="button" className="text-sm text-primary hover:underline">
            ¿La olvidaste?
          </button>
        </div>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-12 pr-12" />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-2 h-12 text-base" disabled={loading}>
        {loading && <LoaderCircle className="animate-spin" />}
        Entrar
      </Button>
    </form>
  )
}
