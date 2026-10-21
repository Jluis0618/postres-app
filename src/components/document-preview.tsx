import { CakeSlice } from "lucide-react"
import type { Customer, LineItem } from "@/lib/types"
import { formatMoney, formatShortDate } from "@/lib/format"

// Cómo se ve la cotización o factura que recibe el cliente (y su PDF).
export function DocumentPreview({
  kind,
  number,
  business,
  customer,
  dates,
  items,
  totals,
  paid,
  note,
  stamp,
}: {
  kind: "COTIZACIÓN" | "FACTURA"
  number: string
  business: { business_name: string; phone: string | null; address: string | null; tax_id: string | null }
  customer: Customer
  dates: { label: string; value: string }[]
  items: LineItem[]
  totals: { subtotal: number; discount: number; tax: number; total: number }
  paid?: number
  note: string | null
  stamp?: { label: string; className: string }
}) {
  return (
    <div className="print-area relative overflow-hidden rounded-xl bg-white p-6 text-[13px] text-neutral-800 shadow-sm ring-1 ring-black/5 sm:p-10">
      {stamp && (
        <div
          className={`pointer-events-none absolute top-16 right-6 rotate-12 rounded-lg border-4 px-4 py-1 font-heading text-2xl font-bold tracking-widest uppercase opacity-80 sm:right-10 ${stamp.className}`}
        >
          {stamp.label}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#c0395a] text-white">
            <CakeSlice className="size-6" />
          </span>
          <div>
            <div className="font-heading text-xl font-semibold text-neutral-900">{business.business_name}</div>
            <div className="text-xs text-neutral-500">
              {[business.tax_id && `RNC ${business.tax_id}`, business.phone].filter(Boolean).join(" · ")}
            </div>
            <div className="text-xs text-neutral-500">{business.address}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold tracking-[0.2em] text-[#c0395a]">{kind}</div>
          <div className="font-heading text-2xl font-semibold text-neutral-900">{number}</div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-neutral-50 p-3">
          <div className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Cliente</div>
          <div className="mt-1 font-medium text-neutral-900">{customer.name}</div>
          {customer.phone && <div className="text-neutral-600">{customer.phone}</div>}
          {customer.tax_id && <div className="text-neutral-600">RNC/Cédula {customer.tax_id}</div>}
          {customer.address && <div className="text-neutral-600">{customer.address}</div>}
        </div>
        <dl className="grid content-start gap-1 sm:justify-items-end">
          {dates.map((d) => (
            <div key={d.label} className="flex gap-2">
              <dt className="text-neutral-500">{d.label}:</dt>
              <dd className="font-medium">{formatShortDate(d.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <table className="mt-8 w-full">
        <thead>
          <tr className="border-b-2 border-neutral-200 text-left text-[11px] tracking-wider text-neutral-500 uppercase">
            <th className="pb-2 font-semibold">Descripción</th>
            <th className="pb-2 text-right font-semibold">Cant.</th>
            <th className="hidden pb-2 text-right font-semibold sm:table-cell">Precio</th>
            <th className="pb-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx} className="border-b border-neutral-100 align-top">
              <td className="py-3 pr-2">
                <div className="font-medium text-neutral-900">{i.description}</div>
                {i.customization && <div className="text-xs text-neutral-500">{i.customization}</div>}
              </td>
              <td className="py-3 text-right tabular-nums">{Number(i.quantity)}</td>
              <td className="hidden py-3 text-right tabular-nums sm:table-cell">{formatMoney(i.unit_price)}</td>
              <td className="py-3 text-right font-medium tabular-nums">{formatMoney(i.quantity * i.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-full max-w-64 space-y-1.5">
          <Line label="Subtotal" value={formatMoney(totals.subtotal)} />
          {totals.discount > 0 && <Line label="Descuento" value={`− ${formatMoney(totals.discount)}`} />}
          {totals.tax > 0 && <Line label="ITBIS" value={formatMoney(totals.tax)} />}
          <div className="flex justify-between border-t-2 border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
          </div>
          {paid !== undefined && (
            <>
              <Line label="Pagado" value={formatMoney(paid)} />
              <div className="flex justify-between font-semibold text-[#c0395a]">
                <dt>Saldo</dt>
                <dd className="tabular-nums">{formatMoney(Math.max(totals.total - paid, 0))}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {note && <p className="mt-10 border-t border-dashed border-neutral-200 pt-4 text-center text-xs whitespace-pre-line text-neutral-500">{note}</p>}
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-600">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
