"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck, Eye, EyeOff, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset, signIn } from "@/app/actions/auth"

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "reset" | "sent">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (mode === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 p-6 text-center text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <CircleCheck className="size-10" />
        <p>Si ese correo tiene cuenta, te llegó un enlace para crear una contraseña nueva.</p>
        <Button variant="ghost" onClick={() => setMode("login")}>
          Volver a entrar
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          if (mode === "reset") {
            const r = await requestPasswordReset(email)
            if (r.ok) setMode("sent")
            else setError(r.error)
            return
          }
          const r = await signIn(email, password)
          if (r.ok) {
            router.replace("/")
            router.refresh()
          } else setError(r.error)
        })
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="h-12"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {mode === "login" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => setMode("reset")}>
              ¿La olvidaste?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="h-12 pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
      )}
      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="mt-2 h-12 text-base" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />}
        {mode === "reset" ? "Enviar enlace" : "Entrar"}
      </Button>
      {mode === "reset" && (
        <Button type="button" variant="ghost" onClick={() => setMode("login")}>
          Volver
        </Button>
      )}
    </form>
  )
}
