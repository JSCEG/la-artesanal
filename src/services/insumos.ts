import { supabase } from './supabase'

export type TipoMovimiento = 'entrada' | 'salida' | 'merma' | 'ajuste'

export interface Insumo {
  id: string
  nombre: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  proveedor: string | null
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface InsumoMovimiento {
  id: string
  insumo_id: string
  tipo: TipoMovimiento
  cantidad: number // ya firmado (entrada +, salida/merma -)
  motivo: string | null
  created_at: string
  created_by: string | null
}

export interface InsumoFormData {
  nombre: string
  unidad: string
  stock_minimo: number
  costo_unitario: number
  proveedor: string
  notas: string
  activo: boolean
}

// ─── CRUD insumos ────────────────────────────────────────────────────────────

export async function getInsumos(): Promise<Insumo[]> {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error
  return (data ?? []) as Insumo[]
}

export async function upsertInsumo(
  form: InsumoFormData,
  id?: string,
  stockInicial?: number,
) {
  const payload = {
    nombre: form.nombre.trim(),
    unidad: form.unidad.trim() || 'pz',
    stock_minimo: form.stock_minimo,
    costo_unitario: form.costo_unitario,
    proveedor: form.proveedor.trim() || null,
    notas: form.notas.trim() || null,
    activo: form.activo,
  }
  if (id) return supabase.from('insumos').update(payload).eq('id', id).select().single()

  const res = await supabase.from('insumos').insert(payload).select().single()
  // Si crea + stock inicial > 0 → genera movimiento entrada auto
  if (!res.error && res.data && stockInicial && stockInicial > 0) {
    const { data: auth } = await supabase.auth.getUser()
    await supabase.from('insumo_movimientos').insert({
      insumo_id: res.data.id,
      tipo: 'entrada',
      cantidad: stockInicial,
      motivo: 'Carga inicial',
      created_by: auth?.user?.id ?? null,
    })
  }
  return res
}

export async function deleteInsumo(id: string) {
  return supabase.from('insumos').delete().eq('id', id)
}

// ─── Movimientos ─────────────────────────────────────────────────────────────

export async function getMovimientos(insumoId: string): Promise<InsumoMovimiento[]> {
  const { data, error } = await supabase
    .from('insumo_movimientos')
    .select('*')
    .eq('insumo_id', insumoId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as InsumoMovimiento[]
}

export async function createMovimiento(data: {
  insumo_id: string
  tipo: TipoMovimiento
  cantidad_abs: number        // siempre positivo desde el form; aquí se firma
  motivo: string
  createdBy: string
}) {
  const signed = data.tipo === 'entrada'
    ? data.cantidad_abs
    : data.tipo === 'ajuste'
      ? data.cantidad_abs                // ajuste puede ser +/- (caller debe pasar signo)
      : -data.cantidad_abs
  return supabase.from('insumo_movimientos').insert({
    insumo_id: data.insumo_id,
    tipo: data.tipo,
    cantidad: signed,
    motivo: data.motivo.trim() || null,
    created_by: data.createdBy,
  }).select().single()
}
