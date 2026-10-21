import { headers } from "next/headers"
import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/lib/auth"
import { getSettings, listProfiles, listWebhookDeliveries } from "@/lib/data"
import { formatDay, formatTime } from "@/lib/format"
import { SettingsForm } from "./settings-form"

export const metadata = { title: "Configuración" }

export default async function SettingsPage() {
  const user = await requireAdmin()
  const [settings, users, deliveries, h] = await Promise.all([getSettings(), listProfiles(), listWebhookDeliveries(), headers()])
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tu-dominio"
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configuración" />
      <SettingsForm
        settings={settings}
        users={users}
        currentUserId={user.id}
        deliveries={deliveries.map((d) => ({
          id: d.id,
          order_number: d.order.number,
          external_ref: d.order.external_ref,
          status: d.status,
          attempts: d.attempts,
          last_error: d.last_error,
          when: `${formatDay(d.created_at)} ${formatTime(d.created_at)}`,
        }))}
        integration={{
          apiKeyConfigured: !!process.env.COMMISSIONS_API_KEY,
          webhookUrl: process.env.COMMISSIONS_WEBHOOK_URL ?? null,
          secretConfigured: !!process.env.COMMISSIONS_WEBHOOK_SECRET,
          adminKeyConfigured: !!process.env.SUPABASE_SECRET_KEY,
          apiBaseUrl: `${protocol}://${host}`,
        }}
      />
    </div>
  )
}
