import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-7xl">🍰</div>
      <h1 className="font-heading text-3xl font-semibold">No encontramos esta página</h1>
      <p className="max-w-sm text-muted-foreground">Puede que el enlace esté mal o que eso ya no exista.</p>
      <Button size="lg" className="mt-2 h-11 px-5" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}
