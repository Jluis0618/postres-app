import Link from "next/link"
import { MapPin, MessageCircle, Phone, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { requireStaff } from "@/lib/auth"
import { getSettings, listCustomers } from "@/lib/data"
import { formatMoney, initials } from "@/lib/format"
import { firstName, whatsappLink } from "@/lib/whatsapp"
import { CustomerDialog } from "./customer-dialog"

export const metadata = { title: "Clientes" }

export default async function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  await requireStaff()
  const { q } = await searchParams
  const search = typeof q === "string" ? q.trim().toLowerCase() : ""
  const [all, settings] = await Promise.all([listCustomers(), getSettings()])
  const customers = search
    ? all.filter((c) => c.name.toLowerCase().includes(search) || (c.phone ?? "").replace(/\D/g, "").includes(search.replace(/\D/g, "") || "—"))
    : all

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${all.length} clientes`}
        actions={
          <CustomerDialog>
            <Button size="lg" className="h-11 px-4">
              <Plus /> Nuevo cliente
            </Button>
          </CustomerDialog>
        }
      />
      {all.length > 0 && (
        <form className="relative mb-5 max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nombre o teléfono"
            className="h-11 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </form>
      )}
      {all.length === 0 ? (
        <EmptyState
          emoji="👥"
          title="Todavía no hay clientes"
          description="Se agregan aquí o directamente al crear una orden. Los pedidos del sistema de comisiones crean el cliente solos."
          action={
            <CustomerDialog>
              <Button size="lg" className="h-11">
                <Plus /> Agregar cliente
              </Button>
            </CustomerDialog>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <Card key={c.id} size="sm">
              <CardContent className="flex flex-col gap-3">
                <Link href={`/clientes/${c.id}`} className="group flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium group-hover:text-primary group-hover:underline">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.orders} {c.orders === 1 ? "orden" : "órdenes"} · {formatMoney(c.spent)}
                    </div>
                  </div>
                </Link>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {c.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="size-4" /> {c.phone}
                    </span>
                  )}
                  {c.address && (
                    <span className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0" /> <span className="truncate">{c.address}</span>
                    </span>
                  )}
                </div>
                {c.phone && (
                  <Button variant="outline" className="h-10" asChild>
                    <a href={whatsappLink(c.phone, `Hola ${firstName(c.name)}, te escribo de ${settings.business_name}.`)} target="_blank" rel="noreferrer">
                      <MessageCircle /> WhatsApp
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {customers.length === 0 && <p className="py-8 text-muted-foreground">Ningún cliente coincide con “{search}”.</p>}
        </div>
      )}
    </>
  )
}
