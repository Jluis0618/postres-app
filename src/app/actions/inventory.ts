"use server"

import { listProductMovements, listSupplyMovements } from "@/lib/data"
import type { ActionResult, Missing, Movement, SupplyUnit } from "@/lib/types"
import { fail, must, run, sessionClient } from "./helpers"

export type SupplyInput = {
  id?: string
  name: string
  unit: SupplyUnit
  initial_stock?: number
  min_stock: number
  unit_cost: number
  supplier: string
  notes: string
  is_active?: boolean
}

export async function saveSupply(input: SupplyInput) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!input.name.trim()) throw new Error("Escribe el nombre del insumo")
    const row = {
      name: input.name.trim(),
      min_stock: input.min_stock,
      unit_cost: input.unit_cost,
      supplier: input.supplier.trim() || null,
      notes: input.notes.trim() || null,
    }
    if (input.id) {
      must(await supabase.from("supplies").update({ ...row, is_active: input.is_active ?? true }).eq("id", input.id))
    } else {
      // El stock inicial queda registrado como movimiento "Stock inicial" (trigger en la base).
      must(await supabase.from("supplies").insert({ ...row, unit: input.unit, stock_on_hand: input.initial_stock ?? 0 }))
    }
  })
}

export async function recordPurchase(input: {
  supplier: string
  purchased_on: string
  items: { supply_id: string; quantity: number; total_cost: number }[]
}) {
  return run(async () => {
    const supabase = await sessionClient()
    must(
      await supabase.rpc("record_purchase", {
        p_purchase: { supplier: input.supplier, purchased_on: input.purchased_on },
        p_items: input.items,
      })
    )
  })
}

/** mode "count": quantity es lo que hay realmente. mode "waste": quantity es lo que se perdió. */
export async function adjustSupply(input: { supply_id: string; mode: "count" | "waste"; quantity: number; current: number; note: string }) {
  return run(async () => {
    const supabase = await sessionClient()
    // El conteo se compara con el stock de este momento, no con el que había al abrir la ventana.
    const { stock_on_hand } = must(await supabase.from("supplies").select("stock_on_hand").eq("id", input.supply_id).single()) as { stock_on_hand: number }
    const delta = input.mode === "count" ? input.quantity - Number(stock_on_hand) : -input.quantity
    if (delta === 0) return
    must(
      await supabase.from("supply_movements").insert({
        supply_id: input.supply_id,
        type: input.mode === "waste" ? "waste" : "adjustment",
        quantity: delta,
        notes: input.note.trim() || (input.mode === "waste" ? "Merma" : "Corrección de conteo"),
      })
    )
  })
}

export async function getSupplyHistory(supplyId: string): Promise<ActionResult<Movement[]>> {
  try {
    await sessionClient()
    return { ok: true, data: await listSupplyMovements(supplyId) }
  } catch (error) {
    return fail(error)
  }
}

/** mode "count": quantity es lo que hay realmente. mode "waste": quantity es lo que se perdió. */
export async function adjustProductStock(input: { product_id: string; mode: "count" | "waste"; quantity: number; note: string }) {
  return run(async () => {
    const supabase = await sessionClient()
    // El conteo se compara con el stock de este momento, no con el que había al abrir la ventana.
    const { stock_available } = must(await supabase.from("products").select("stock_available").eq("id", input.product_id).single()) as { stock_available: number }
    const delta = input.mode === "count" ? input.quantity - Number(stock_available) : -input.quantity
    if (delta === 0) return
    must(
      await supabase.from("product_movements").insert({
        product_id: input.product_id,
        type: input.mode === "waste" ? "waste" : "adjustment",
        quantity: delta,
        notes: input.note.trim() || (input.mode === "waste" ? "Merma" : "Corrección de conteo"),
      })
    )
  })
}

/** Activa o apaga el stock de un producto. Apagarlo solo se puede si no quedan unidades hechas. */
export async function setProductTracking(productId: string, track: boolean) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!track) {
      const { stock_available } = must(await supabase.from("products").select("stock_available").eq("id", productId).single()) as { stock_available: number }
      if (Number(stock_available) > 0) throw new Error("Todavía hay unidades hechas. Ajusta el stock a 0 antes de dejar de llevarlo.")
    }
    must(await supabase.from("products").update({ track_stock: track }).eq("id", productId))
  })
}

export async function getProductHistory(productId: string): Promise<ActionResult<Movement[]>> {
  try {
    await sessionClient()
    return { ok: true, data: await listProductMovements(productId) }
  } catch (error) {
    return fail(error)
  }
}

/** consumeSupplies: descontar los ingredientes de la receta (lo normal) o solo sumar al stock. */
export async function registerProduction(productId: string, quantity: number, consumeSupplies = true): Promise<ActionResult<{ missing?: Missing[] }>> {
  return run(async () => {
    const supabase = await sessionClient()
    const result = must(
      await supabase.rpc("register_production", { p_product_id: productId, p_quantity: quantity, p_consume_supplies: consumeSupplies })
    ) as {
      ok: boolean
      missing?: Missing[]
    }
    if (!result.ok) return { missing: result.missing }
    return {}
  })
}

export type ProductInput = {
  id?: string
  name: string
  description: string
  category_id: string | null
  price: number
  unit: string
  emoji: string
  track_stock: boolean
  recipe_yield: number
  is_active: boolean
  recipe: { supply_id: string; quantity: number }[]
}

export async function saveProduct(input: ProductInput) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!input.name.trim()) throw new Error("Escribe el nombre del producto")
    const { recipe, ...product } = input
    return must(await supabase.rpc("save_product", { p_product: product, p_recipe: recipe })) as string
  })
}

export async function createCategory(name: string) {
  return run(async () => {
    const supabase = await sessionClient()
    if (!name.trim()) throw new Error("Escribe el nombre de la categoría")
    const row = must(await supabase.from("categories").insert({ name: name.trim() }).select("id, name, sort_order").single())
    return row as { id: string; name: string; sort_order: number }
  })
}
