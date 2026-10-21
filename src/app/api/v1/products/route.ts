import { NextResponse } from "next/server"
import { requireApiKey } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/v1/products: catálogo activo con precios, para el botón "Hacer pedido" del sistema de comisiones.
export async function GET(request: Request) {
  const denied = requireApiKey(request)
  if (denied) return denied

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, unit, category:categories(name)")
    .eq("is_active", true)
    .order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    products: (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      unit: p.unit,
      category: (p.category as unknown as { name: string } | null)?.name ?? null,
    })),
  })
}
