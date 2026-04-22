import { supabase } from './supabase'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type EstatusPedido = 'borrador' | 'confirmado' | 'en_ruta' | 'entregado' | 'cancelado'
export type EstatusEntrega = 'pendiente' | 'parcial' | 'completa' | 'fallida'
export type MetodoCobro = 'efectivo' | 'transferencia' | 'tarjeta' | 'stripe' | 'paypal'

export interface PedidoDetalle {
  id: string
  pedido_id: string
  producto_id: number
  cantidad: number
  precio_unit: number
  // joined
  producto?: { name: string; unit: string; photo_url: string | null }
}

export interface Pedido {
  id: string
  cliente_id: string
  sucursal_id: string | null
  estatus: EstatusPedido
  fecha_pedido: string
  fecha_entrega_programada: string | null
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  promo_id?: string | null
  descuento_monto?: number
  // joined
  cliente?: { nombre_comercial: string; tipo: string }
  sucursal?: { nombre_sucursal: string } | null
  detalle?: PedidoDetalle[]
}

export interface PedidoFormData {
  cliente_id: string
  sucursal_id: string | null
  fecha_pedido: string
  fecha_entrega_programada: string | null
  notas: string
  promo_id?: string | null
  descuento_monto?: number
  detalle: { producto_id: number; cantidad: number; precio_unit: number }[]
}

export interface EntregaDetalle {
  id: string
  entrega_id: string
  producto_id: number
  cantidad: number
  precio_unit: number
  producto?: { name: string; unit: string; photo_url?: string | null }
}

export interface Entrega {
  id: string
  pedido_id: string
  estatus: EstatusEntrega
  fecha_entrega: string
  entregado_por: string | null
  notas: string | null
  foto_url: string | null
  created_at: string
  // joined
  pedido?: {
    fecha_pedido: string
    cliente?: { nombre_comercial: string }
    sucursal?: { nombre_sucursal: string } | null
  }
  detalle?: EntregaDetalle[]
}

export interface EntregaFormData {
  pedido_id: string
  fecha_entrega: string
  entregado_por: string
  notas: string
  estatus: EstatusEntrega
  foto_url?: string | null
  detalle: { producto_id: number; cantidad: number; precio_unit: number }[]
}

export interface Cobro {
  id: string
  cliente_id: string
  sucursal_id: string | null
  pedido_id: string | null
  monto: number
  metodo: MetodoCobro
  referencia: string | null
  notas: string | null
  fecha_cobro: string
  created_at: string
  cliente?: { nombre_comercial: string }
  pedido?: { fecha_pedido: string } | null
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export async function getPedidos(): Promise<Pedido[]> {
  const { data } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(nombre_comercial, tipo),
      sucursal:sucursales_clientes(nombre_sucursal),
      detalle:pedido_detalle(*, producto:products(name, unit, photo_url))
    `)
    .order('fecha_pedido', { ascending: false })
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const { data } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(nombre_comercial, tipo),
      sucursal:sucursales_clientes(nombre_sucursal),
      detalle:pedido_detalle(*, producto:products(name, unit, photo_url))
    `)
    .eq('id', id)
    .single()
  return data
}

export async function createPedido(form: PedidoFormData, createdBy: string) {
  // 1. Crear el pedido
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({
      cliente_id: form.cliente_id,
      sucursal_id: form.sucursal_id || null,
      fecha_pedido: form.fecha_pedido,
      fecha_entrega_programada: form.fecha_entrega_programada || null,
      notas: form.notas || null,
      promo_id: form.promo_id ?? null,
      descuento_monto: form.descuento_monto ?? 0,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !pedido) return { error: error ?? new Error('Error al crear pedido') }

  // 2. Insertar el detalle
  if (form.detalle.length > 0) {
    const { error: detError } = await supabase
      .from('pedido_detalle')
      .insert(form.detalle.map(d => ({ ...d, pedido_id: pedido.id })))
    if (detError) return { error: detError }
  }

  if (form.promo_id) {
    await supabase.rpc('incrementar_uso_promo', { p_id: form.promo_id }).then(() => {}, () => {})
  }

  return { data: pedido, error: null }
}

export async function updatePedidoEstatus(id: string, estatus: EstatusPedido) {
  const { error } = await supabase.from('pedidos').update({ estatus }).eq('id', id)
  if (error) throw error
}

export async function deletePedido(id: string) {
  // CASCADE borra pedido_detalle automáticamente
  return supabase.from('pedidos').delete().eq('id', id)
}

// ─── Cálculo de totales ───────────────────────────────────────────────────────

export function calcularTotal(detalle: { cantidad: number; precio_unit: number }[]) {
  return detalle.reduce((sum, d) => sum + d.cantidad * d.precio_unit, 0)
}

// ─── Historial / Timeline ─────────────────────────────────────────────────────

export interface PedidoHistorialEntry {
  id: string
  pedido_id: string
  estatus_from: EstatusPedido | null
  estatus_to: EstatusPedido
  changed_by: string | null
  notas: string | null
  created_at: string
  changed_by_name?: string | null
}

export async function getHistorialPedido(pedidoId: string): Promise<PedidoHistorialEntry[]> {
  const { data, error } = await supabase
    .from('pedido_historial')
    .select('*')
    .eq('pedido_id', pedidoId)
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as PedidoHistorialEntry[]

  // Resolver nombres de usuarios (profiles)
  const uids = Array.from(new Set(rows.map(r => r.changed_by).filter(Boolean))) as string[]
  if (uids.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uids)
    const map = new Map<string, string>()
    for (const p of profs ?? []) map.set(p.id, p.full_name ?? '')
    for (const r of rows) if (r.changed_by) r.changed_by_name = map.get(r.changed_by) ?? null
  }
  return rows
}

// ─── Cobros ──────────────────────────────────────────────────────────────────

export async function getCobros(clienteId?: string): Promise<Cobro[]> {
  let q = supabase
    .from('cobros')
    .select(`*, cliente:clientes(nombre_comercial), pedido:pedidos(fecha_pedido)`)
    .order('fecha_cobro', { ascending: false })
  if (clienteId) q = q.eq('cliente_id', clienteId)
  const { data } = await q
  return data ?? []
}

export async function createCobro(data: {
  cliente_id: string
  sucursal_id: string | null
  pedido_id: string | null
  monto: number
  metodo: MetodoCobro
  referencia: string
  notas: string
  createdBy: string
}) {
  const { createdBy, ...rest } = data
  return supabase.from('cobros').insert({ ...rest, created_by: createdBy }).select().single()
}

// ─── Entregas ─────────────────────────────────────────────────────────────────

export async function getEntregas(): Promise<Entrega[]> {
  const { data } = await supabase
    .from('entregas')
    .select(`
      *,
      pedido:pedidos(
        fecha_pedido,
        cliente:clientes(nombre_comercial),
        sucursal:sucursales_clientes(nombre_sucursal)
      ),
      detalle:entrega_detalle(*, producto:products(name, unit, photo_url))
    `)
    .order('fecha_entrega', { ascending: false })
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPedidosPendientesEntrega(): Promise<Pedido[]> {
  const { data } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(nombre_comercial, tipo),
      sucursal:sucursales_clientes(nombre_sucursal),
      detalle:pedido_detalle(*, producto:products(name, unit, photo_url))
    `)
    .in('estatus', ['confirmado', 'en_ruta'])
    .order('fecha_entrega_programada', { ascending: true, nullsFirst: false })
    .order('fecha_pedido', { ascending: true })
  return data ?? []
}

export async function uploadEntregaFoto(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('entregas-fotos')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('entregas-fotos').getPublicUrl(path)
  return data.publicUrl
}

export async function createEntrega(form: EntregaFormData, createdBy: string) {
  const { data: entrega, error } = await supabase
    .from('entregas')
    .insert({
      pedido_id: form.pedido_id,
      estatus: form.estatus,
      fecha_entrega: form.fecha_entrega,
      entregado_por: form.entregado_por || null,
      notas: form.notas || null,
      foto_url: form.foto_url ?? null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !entrega) return { error: error ?? new Error('Error al crear entrega') }

  if (form.detalle.length > 0) {
    const { error: detError } = await supabase
      .from('entrega_detalle')
      .insert(form.detalle.map(d => ({ ...d, entrega_id: entrega.id })))
    if (detError) return { error: detError }
  }

  // Si la entrega es completa → marcar el pedido como entregado
  if (form.estatus === 'completa') {
    await supabase.from('pedidos').update({ estatus: 'entregado' }).eq('id', form.pedido_id)
  }

  return { data: entrega, error: null }
}

// ─── Saldo por cliente ────────────────────────────────────────────────────────

export async function getSaldoCliente(clienteId: string): Promise<{
  total_pedidos: number
  total_cobrado: number
  saldo: number
}> {
  // Total en pedidos entregados o confirmados (no cancelados, no borrador)
  const { data: pedidosData } = await supabase
    .from('pedidos')
    .select('id, descuento_monto, detalle:pedido_detalle(cantidad, precio_unit)')
    .eq('cliente_id', clienteId)
    .in('estatus', ['confirmado', 'en_ruta', 'entregado'])

  const total_pedidos = (pedidosData ?? []).reduce((sum: number, p: any) => {
    const sub = (p.detalle ?? []).reduce((s: number, d: any) => s + d.cantidad * d.precio_unit, 0)
    return sum + Math.max(0, sub - Number(p.descuento_monto ?? 0))
  }, 0)

  // Total cobrado
  const { data: cobrosData } = await supabase
    .from('cobros')
    .select('monto')
    .eq('cliente_id', clienteId)

  const total_cobrado = (cobrosData ?? []).reduce((sum: number, c: any) => sum + c.monto, 0)

  return { total_pedidos, total_cobrado, saldo: total_pedidos - total_cobrado }
}
