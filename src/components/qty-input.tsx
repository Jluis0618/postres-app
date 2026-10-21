"use client"

import { useState } from "react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"
import type { SupplyUnit } from "@/lib/types"

// Unidades que se pueden escribir para cada unidad base, con su factor.
const options: Record<SupplyUnit, { label: string; factor: number }[]> = {
  g: [
    { label: "kg", factor: 1000 },
    { label: "g", factor: 1 },
  ],
  ml: [
    { label: "L", factor: 1000 },
    { label: "ml", factor: 1 },
  ],
  unit: [{ label: "u", factor: 1 }],
}

/** Cantidad escrita en kg/L/g/ml/u. onChange recibe siempre la unidad base (g, ml, u). */
export function QtyInput({
  unit,
  onChange,
  defaultUnit,
  id,
  placeholder = "0",
  className,
}: {
  unit: SupplyUnit
  onChange: (baseQty: number) => void
  defaultUnit?: "big" | "small"
  id?: string
  placeholder?: string
  className?: string
}) {
  const opts = options[unit]
  const [unitIndex, setUnitIndex] = useState(defaultUnit === "small" && opts.length > 1 ? 1 : 0)
  const [text, setText] = useState("")

  function emit(value: string, index: number) {
    const n = Number(value.replace(",", "."))
    onChange(Number.isFinite(n) ? n * opts[index].factor : 0)
  }

  return (
    <div className={cn("flex", className)}>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        className={cn("h-11 flex-1", opts.length > 1 ? "rounded-r-none" : "")}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          emit(e.target.value, unitIndex)
        }}
      />
      {opts.length > 1 ? (
        <div className="flex rounded-r-lg border border-l-0">
          {opts.map((o, i) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                setUnitIndex(i)
                emit(text, i)
              }}
              className={cn(
                "w-11 text-sm font-medium transition-colors first:rounded-none last:rounded-r-lg",
                i === unitIndex ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <span className="ml-2 flex items-center text-sm text-muted-foreground">unidades</span>
      )}
    </div>
  )
}
