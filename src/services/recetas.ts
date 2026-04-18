import { supabase } from './supabase'

export interface RecetaItem {
  id: string
  receta_id: string
  insumo_id: string
  cantidad: number
  notas: string | null
  insumo?: { nombre: string; unidad: string; costo_unitario: number } | null
}

export interface Receta {
  id: string
  producto_id: number
  rendimiento: number
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
  items: RecetaItem[]
}

export interface RecetaItemInput {
  insumo_id: string
  cantidad: number
  notas?: string
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export async function getRecetaByProducto(productoId: number): Promise<Receta | null> {
  const { data, error } = await supabase
    .from('recetas')
    .select(`
      id, producto_id, rendimiento, notas, activo, created_at, updated_at,
      items:receta_items(
        id, receta_id, insumo_id, cantidad, notas,
        insumo:insumos(nombre, unidad, costo_unitario)
      )
    `)
    .eq('producto_id', productoId)
    .maybeSingle()
  if (error) throw error
  return (data as any) ?? null
}

export async function getRecetasCount(): Promise<number> {
  const { count } = await supabase
    .from('recetas')
    .select('*', { count: 'exact', head: true })
  return count ?? 0
}

// ─── Upsert (crea o actualiza receta + reemplaza items) ──────────────────────

export async function upsertReceta(
  productoId: number,
  rendimiento: number,
  notas: string | null,
  activo: boolean,
  items: RecetaItemInput[],
) {
  // 1) upsert cabecera
  const existente = await getRecetaByProducto(productoId)
  let recetaId: string

  if (existente) {
    const { error } = await supabase
      .from('recetas')
      .update({ rendimiento, notas, activo })
      .eq('id', existente.id)
    if (error) return { error }
    recetaId = existente.id

    // Borrar items previos (reemplazo completo, simplifica v1)
    const { error: delErr } = await supabase
      .from('receta_items')
      .delete()
      .eq('receta_id', recetaId)
    if (delErr) return { error: delErr }
  } else {
    const { data, error } = await supabase
      .from('recetas')
      .insert({ producto_id: productoId, rendimiento, notas, activo })
      .select('id')
      .single()
    if (error) return { error }
    recetaId = data.id
  }

  // 2) insertar items
  if (items.length > 0) {
    const rows = items.map(i => ({
      receta_id: recetaId,
      insumo_id: i.insumo_id,
      cantidad: i.cantidad,
      notas: i.notas ?? null,
    }))
    const { error } = await supabase.from('receta_items').insert(rows)
    if (error) return { error }
  }

  return { error: null, recetaId }
}

export async function deleteReceta(id: string) {
  return supabase.from('recetas').delete().eq('id', id)
}

// ─── Costo calculado de una receta ────────────────────────────────────────────

export function calcularCostoReceta(receta: Receta): number {
  const costoTotal = receta.items.reduce((sum, it) => {
    const costo = it.insumo?.costo_unitario ?? 0
    return sum + costo * it.cantidad
  }, 0)
  return costoTotal / (receta.rendimiento || 1)
}
