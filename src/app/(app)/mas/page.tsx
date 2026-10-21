import Link from "next/link"
import { ChartColumn, ChevronRight, FileText, LogOut, Settings, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"

const items = [
  { href: "/cotizaciones", label: "Cotizaciones", description: "Propuestas de precio", icon: FileText },
  { href: "/clientes", label: "Clientes", description: "Contactos e historial", icon: Users },
  { href: "/reportes", label: "Reportes", description: "Ventas, lo más vendido, cuentas por cobrar", icon: ChartColumn },
  { href: "/configuracion", label: "Configuración", description: "Datos del negocio, ITBIS, usuarios", icon: Settings },
  { href: "/login", label: "Cerrar sesión", description: "Mamá · Administradora", icon: LogOut },
]

// Menú del celular para lo que no cabe en la barra inferior.
export default function MorePage() {
  return (
    <>
      <PageHeader title="Más" />
      <Card className="py-1">
        <CardContent className="flex flex-col px-1">
          {items.map(({ href, label, description, icon: Icon }) => (
            <Link key={label} href={href} className="flex items-center gap-4 rounded-xl px-3 py-4 hover:bg-muted/70">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <div className="flex-1">
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
