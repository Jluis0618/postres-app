import { PageHeader } from "@/components/page-header"
import { settings, users, webhookDeliveries } from "@/lib/demo-data"
import { formatDay } from "@/lib/format"
import { SettingsForm } from "./settings-form"

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configuración" />
      <SettingsForm
        settings={settings}
        users={users}
        deliveries={webhookDeliveries.map((d) => ({ ...d, when: formatDay(d.created_at) }))}
      />
    </div>
  )
}
