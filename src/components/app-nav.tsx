"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import {
  CakeSlice,
  ChartColumn,
  ClipboardList,
  Ellipsis,
  FileText,
  House,
  LoaderCircle,
  LogOut,
  Package,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

// Mientras la página nueva carga, el ícono del enlace tocado gira.
function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus()
  return pending ? <LoaderCircle className="size-5 animate-spin" /> : <Icon className="size-5" />
}

const links = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/ordenes", label: "Órdenes", icon: ClipboardList },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/facturas", label: "Facturas", icon: Receipt },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/reportes", label: "Reportes", icon: ChartColumn },
]

// En el celular solo caben 5; el resto va en "Más".
const mobileLinks = [
  links[0],
  links[1],
  links[2],
  links[4],
  { href: "/mas", label: "Más", icon: Ellipsis },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (href === "/mas") return ["/mas", "/cotizaciones", "/clientes", "/reportes", "/configuracion"].some((p) => pathname.startsWith(p))
  return pathname.startsWith(href)
}

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <CakeSlice className="size-5" />
        </span>
        <span className="font-heading text-lg leading-tight font-semibold">{businessName}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive(pathname, href) && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
          >
            <NavIcon icon={Icon} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/configuracion"
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname.startsWith("/configuracion") && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          <NavIcon icon={Settings} />
          Configuración
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">M</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">Mamá</div>
            <div className="truncate text-xs text-sidebar-foreground/60">Administradora</div>
          </div>
          <Link href="/login" className="text-sidebar-foreground/60 hover:text-sidebar-foreground" aria-label="Cerrar sesión">
            <LogOut className="size-4" />
          </Link>
        </div>
      </div>
    </aside>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {mobileLinks.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-muted-foreground",
            isActive(pathname, href) && "text-primary"
          )}
        >
          <NavIcon icon={Icon} />
          {label}
        </Link>
      ))}
    </nav>
  )
}
