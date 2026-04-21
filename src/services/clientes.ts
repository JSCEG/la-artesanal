import { supabase } from './supabase'

export type TipoCliente = 'mayorista' | 'minorista' | 'evento'
export type EstatusSucursal = 'activo' | 'pausado' | 'inactivo'

export interface Cliente {
  id: string
  nombre_comercial: string
  tipo: TipoCliente
  contacto_principal: string | null
  telefono: string | null
  correo: string | null
  razon_social: string | null
  rfc: string | null
  maneja_credito: boolean
  limite_credito: number
  notas: string | null
  activo: boolean
  created_at: string
  sucursales?: Sucursal[]
}

export interface Sucursal {
  id: string
  cliente_id: string
  nombre_sucursal: string
  direccion: string | null
  latitud: number | null
  longitud: number | null
  responsable: string | null
  telefono: string | null
  tipo_negocio: string | null
  dias_visita: string | null
  capacidad_refri: number | null
  estatus: EstatusSucursal
  notas: string | null
  created_at: string
  cliente?: { nombre_comercial: string; tipo: TipoCliente }
}

export interface ClienteFormData {
  nombre_comercial: string
  tipo: TipoCliente
  contacto_principal: string
  telefono: string
  correo: string
  razon_social: string
  rfc: string
  maneja_credito: boolean
  limite_credito: number
  notas: string
  activo: boolean
}

export interface SucursalFormData {
  nombre_sucursal: string
  direccion: string
  latitud: number | null
  longitud: number | null
  responsable: string
  telefono: string
  tipo_negocio: string
  dias_visita: string
  capacidad_refri: number | null
  estatus: EstatusSucursal
  notas: string
}

export async function getClientes(): Promise<Cliente[]> {
  const { data } = await supabase
    .from('clientes')
    .select(`*, sucursales_clientes(*)`)
    .order('nombre_comercial')
  return (data ?? []).map((c: any) => ({ ...c, sucursales: c.sucursales_clientes }))
}

export async function getSucursales(): Promise<Sucursal[]> {
  const { data } = await supabase
    .from('sucursales_clientes')
    .select(`*, cliente:clientes(nombre_comercial, tipo)`)
    .order('nombre_sucursal')
  return data ?? []
}

export async function upsertCliente(data: ClienteFormData, id?: string) {
  const payload = { ...data, limite_credito: data.maneja_credito ? data.limite_credito : 0 }
  if (id) return supabase.from('clientes').update(payload).eq('id', id).select().single()
  return supabase.from('clientes').insert(payload).select().single()
}

export async function upsertSucursal(data: SucursalFormData, clienteId: string, id?: string) {
  const payload = { ...data, cliente_id: clienteId }
  if (id) return supabase.from('sucursales_clientes').update(payload).eq('id', id).select().single()
  return supabase.from('sucursales_clientes').insert(payload).select().single()
}

export async function toggleClienteActivo(id: string, activo: boolean) {
  return supabase.from('clientes').update({ activo }).eq('id', id)
}

export async function deleteSucursal(id: string) {
  return supabase.from('sucursales_clientes').delete().eq('id', id)
}

export async function deleteCliente(id: string) {
  // Borrar sucursales primero por si no hay CASCADE en la FK
  await supabase.from('sucursales_clientes').delete().eq('cliente_id', id)
  return supabase.from('clientes').delete().eq('id', id)
}

// ─── Portal mayorista ────────────────────────────────────────────────────────

export async function getMiCliente(email: string): Promise<Cliente | null> {
  const { data } = await supabase
    .from('clientes')
    .select('*, sucursales:sucursales_clientes(*)')
    .eq('correo', email)
    .maybeSingle()
  return data as Cliente | null
}
