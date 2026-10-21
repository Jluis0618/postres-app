import { CakeSlice } from "lucide-react"
import { APP_NAME } from "@/lib/brand"
import { LoginForm } from "./login-form"

export const metadata = { title: "Entrar" }

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15">
            <CakeSlice className="size-5" />
          </span>
          <span className="font-heading text-xl font-semibold">{APP_NAME}</span>
        </div>
        <div className="relative z-10 max-w-sm">
          <p className="font-heading text-4xl leading-tight font-semibold">Tus órdenes, tu inventario y tus ventas en un solo lugar.</p>
          <p className="mt-4 text-primary-foreground/80">Desde la tablet o el celular, en la cocina o donde estés.</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-10 text-[14rem] leading-none opacity-15 select-none">
          🧁
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CakeSlice className="size-5" />
            </span>
            <span className="font-heading text-xl font-semibold">{APP_NAME}</span>
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Bienvenida 👋</h1>
          <p className="mt-1 mb-8 text-muted-foreground">Entra con tu correo y contraseña.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
