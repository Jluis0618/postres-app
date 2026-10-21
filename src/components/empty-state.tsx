import type { ReactNode } from "react"

// Pantalla vacía con una explicación de qué hacer primero.
export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
      <div className="text-5xl">{emoji}</div>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
