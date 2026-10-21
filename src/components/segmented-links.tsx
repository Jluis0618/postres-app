import Link from "next/link"
import { cn } from "cn"

// Pestañas que cambian la URL (?param=valor), así cada vista se puede compartir o recargar.
export function SegmentedLinks({
  basePath,
  param,
  current,
  options,
}: {
  basePath: string
  param: string
  current: string
  options: { key: string; label: string; count?: number }[]
}) {
  return (
    <div className="mb-5 inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1">
      {options.map((o) => (
        <Link
          key={o.key}
          href={`${basePath}?${param}=${o.key}`}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors",
            current === o.key && "bg-background text-foreground shadow-sm"
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums">{o.count}</span>
          )}
        </Link>
      ))}
    </div>
  )
}
