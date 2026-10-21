import Link from "next/link"
import { MapPin, MessageCircle, Phone, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { customers, orders, orderTotals, settings } from "@/lib/demo-data"
import { whatsappLink } from "@/lib/demo"
import { formatMoney, initials } from "@/lib/format"
import { CustomerDialog } from "./customer-dialog"

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${customers.length} clientes`}
        actions={
          <CustomerDialog>
            <Button size="lg" className="h-11 px-4">
              <Plus /> Nuevo cliente
            </Button>
          </CustomerDialog>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => {
          const theirs = orders.filter((o) => o.customer_id === c.id && o.status !== "cancelled")
          const spent = theirs.reduce((sum, o) => sum + orderTotals(o).total, 0)
          return (
            <Card key={c.id} size="sm">
              <CardContent className="flex flex-col gap-3">
                <Link href={`/clientes/${c.id}`} className="group flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium group-hover:text-primary group-hover:underline">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {theirs.length} órdenes · {formatMoney(spent)}
                    </div>
                  </div>
                </Link>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Phone className="size-4" /> {c.phone}
                  </span>
                  {c.address && (
                    <span className="flex items-center gap-2">
                      <MapPin className="size-4" /> {c.address}
                    </span>
                  )}
                </div>
                <Button variant="outline" className="h-10" asChild>
                  <a href={whatsappLink(c.phone, `Hola ${c.name.split(" ")[0]}, te escribo de ${settings.business_name}.`)} target="_blank" rel="noreferrer">
                    <MessageCircle /> WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
