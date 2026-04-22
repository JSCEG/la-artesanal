import { supabase } from './supabase'

export type TipoPromo = 'porcentaje' | 'monto_fijo'
export type AplicaA = 'todos' | 'minorista' | 'mayorista'

export interface Promocion {
  id: string
  codigo: string
  descripcion: string | null
  tipo: TipoPromo
  valor: number
  aplica_a: AplicaA
  vigente_desde: string | null
  vigente_hasta: string | null
  uso_max: number | null
  usos: number
  activo: boolean
  created_at: string
  created_by: string | null
}

export interface PromocionFormData {
  codigo: string
  descripcion: string
  tipo: TipoPromo
  valor: number
  aplica_a: AplicaA
  vigente_desde: string | null
  vigente_hasta: string | null
  uso_max: number | null
  activo: boolean
}

export async function getPromociones(): Promise<Promocion[]> {
  const { data } = await supabase.from('promociones').select('*').order('created_at', { ascending: false })
  return (data ?? []) as Promocion[]
}

export async function upsertPromocion(form: PromocionFormData, id?: string, createdBy?: string) {
  const payload = {
    codigo: form.codigo.trim().toUpperCase(),
    descripcion: form.descripcion || null,
    tipo: form.tipo,
    valor: form.valor,
    aplica_a: form.aplica_a,
    vigente_desde: form.vigente_desde || null,
    vigente_hasta: form.vigente_hasta || null,
    uso_max: form.uso_max,
    activo: form.activo,
  }
  if (id) return supabase.from('promociones').update(payload).eq('id', id)
  return supabase.from('promociones').insert({ ...payload, created_by: createdBy ?? null })
}

export async function deletePromocion(id: string) {
  return supabase.from('promociones').delete().eq('id', id)
}

export async function togglePromoActivo(id: string, activo: boolean) {
  return supabase.from('promociones').update({ activo }).eq('id', id)
}

export interface ValidacionPromo {
  id: string | null
  codigo: string
  tipo: TipoPromo | null
  valor: number | null
  descuento: number
  error: string | null
}

export async function validarPromocion(codigo: string, tipoCliente: string, subtotal: number): Promise<ValidacionPromo | null> {
  const { data, error } = await supabase.rpc('validar_promocion', {
    p_codigo: codigo,
    p_tipo_cliente: tipoCliente,
    p_subtotal: subtotal,
  })
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return {
    id: row.id,
    codigo: row.codigo,
    tipo: row.tipo,
    valor: row.valor,
    descuento: Number(row.descuento ?? 0),
    error: row.error,
  }
}
