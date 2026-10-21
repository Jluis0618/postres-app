import { cn } from "cn"
import { toneClasses } from "@/lib/format"

export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string
  tone: keyof typeof toneClasses
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {label}
    </span>
  )
}
