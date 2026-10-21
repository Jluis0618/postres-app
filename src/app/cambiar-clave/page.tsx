"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CakeSlice, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePassword } from "@/app/actions/auth"

// Se llega desde el correo de invitación o de "olvidé mi contraseña".
export default function ChangePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form
        className="flex w-full max-w-sm flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (password !== confirm) return setError("Las contraseñas no coinciden.")
          setError(null)
          startTransition(async () => {
            const r = await updatePassword(password)
            if (r.ok) {
              router.replace("/")
              router.refresh()
            } else setError(r.error)
          })
        }}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CakeSlice className="size-6" />
        </span>
        <h1 className="font-heading text-3xl font-semibold">Crea tu contraseña</h1>
        <p className="-mt-2 text-muted-foreground">Mínimo 8 caracteres.</p>
        <div className="grid gap-2">
          <Label htmlFor="nueva">Contraseña nueva</Label>
          <Input id="nueva" type="password" autoComplete="new-password" className="h-12" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="repetir">Repítela</Label>
          <Input id="repetir" type="password" autoComplete="new-password" className="h-12" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="h-12 text-base" disabled={pending || password.length < 8}>
          {pending && <LoaderCircle className="animate-spin" />}
          Guardar y entrar
        </Button>
      </form>
    </div>
  )
}
