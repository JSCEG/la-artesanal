import { supabase } from './supabase'
import type { EstatusPedido } from './pedidos'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  // Hoy
  pedidosHoy: number
  ingresosHoy: number
  // Totales vivos
  clientesActivos: number
  pedidosPendientes: number
  // Contexto de comparación
  pedidosAyer: number
  ingresosAyer: number
  pedidosMes: number
  ingresosMes: number
}

export interface PedidoReciente {
  id: string
  fecha_pedido: string
  created_at: string
  estatus: EstatusPedido
  cliente_nombre: string
  sucursal_nombre: string | null
  total: number
  n_productos: number
}

export interface TopProducto {
  producto_id: number
  nombre: string
  unidad: string
  photo_url: string | null
  cantidad_vendida: number
  ingresos: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

// Suma total de una lista de detalles (cantidad * precio_unit)
function sumarDetalle(detalle: { cantidad: number; precio_unit: number }[]): number {
  return detalle.reduce((sum, d) => sum + d.cantidad * d.precio_unit, 0)
}

// ─── Métricas principales ────────────────────────────────────────────────────

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const hoy = today()
  const ayer = yesterday()
  const mesInicio = startOfMonth()

  // 1) Pedidos de hoy + detalle (para ingresos)
  const [
    { data: pedidosHoyData },
    { data: pedidosAyerData },
    { data: pedidosMesData },
    { count: pedidosPendientesCount },
    { data: clientesConPedido },
  ] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, estatus, pedido_detalle(cantidad, precio_unit)')
      .eq('fecha_pedido', hoy)
      .neq('estatus', 'cancelado'),
    supabase
      .from('pedidos')
      .select('id, estatus, pedido_detalle(cantidad, precio_unit)')
      .eq('fecha_pedido', ayer)
      .neq('estatus', 'cancelado'),
    supabase
      .from('pedidos')
      .select('id, estatus, pedido_detalle(cantidad, precio_unit)')
      .gte('fecha_pedido', mesInicio)
      .neq('estatus', 'cancelado'),
    supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .in('estatus', ['confirmado', 'en_ruta']),
    supabase
      .from('pedidos')
      .select('cliente_id')
      .neq('estatus', 'cancelado'),
  ])

  const pedidosHoy = pedidosHoyData?.length ?? 0
  const ingresosHoy = (pedidosHoyData ?? []).reduce(
    (sum: number, p: any) => sum + sumarDetalle(p.pedido_detalle ?? []),
    0,
  )

  const pedidosAyer = pedidosAyerData?.length ?? 0
  const ingresosAyer = (pedidosAyerData ?? []).reduce(
    (sum: number, p: any) => sum + sumarDetalle(p.pedido_detalle ?? []),
    0,
  )

  const pedidosMes = pedidosMesData?.length ?? 0
  const ingresosMes = (pedidosMesData ?? []).reduce(
    (sum: number, p: any) => sum + sumarDetalle(p.pedido_detalle ?? []),
    0,
  )

  const clientesActivos = new Set((clientesConPedido ?? []).map((p: any) => p.cliente_id)).size

  return {
    pedidosHoy,
    ingresosHoy,
    clientesActivos,
    pedidosPendientes: pedidosPendientesCount ?? 0,
    pedidosAyer,
    ingresosAyer,
    pedidosMes,
    ingresosMes,
  }
}

// ─── Actividad reciente ──────────────────────────────────────────────────────

export async function getPedidosRecientes(limit = 5): Promise<PedidoReciente[]> {
  const { data } = await supabase
    .from('pedidos')
    .select(`
      id,
      fecha_pedido,
      created_at,
      estatus,
      cliente:clientes(nombre_comercial),
      sucursal:sucursales_clientes(nombre_sucursal),
      detalle:pedido_detalle(cantidad, precio_unit)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((p: any) => ({
    id: p.id,
    fecha_pedido: p.fecha_pedido,
    created_at: p.created_at,
    estatus: p.estatus,
    cliente_nombre: p.cliente?.nombre_comercial ?? 'Sin cliente',
    sucursal_nombre: p.sucursal?.nombre_sucursal ?? null,
    total: sumarDetalle(p.detalle ?? []),
    n_productos: p.detalle?.length ?? 0,
  }))
}

// ─── Top productos (por cantidad vendida en el mes) ──────────────────────────

export async function getTopProductos(limit = 5): Promise<TopProducto[]> {
  const mesInicio = startOfMonth()

  const { data } = await supabase
    .from('pedido_detalle')
    .select(`
      producto_id,
      cantidad,
      precio_unit,
      producto:products(name, unit, photo_url),
      pedido:pedidos!inner(fecha_pedido, estatus)
    `)
    .gte('pedido.fecha_pedido', mesInicio)
    .neq('pedido.estatus', 'cancelado')

  // Agrupar por producto
  const map = new Map<number, TopProducto>()
  for (const row of data ?? []) {
    const r = row as any
    const id = r.producto_id
    if (!map.has(id)) {
      map.set(id, {
        producto_id: id,
        nombre: r.producto?.name ?? `Producto #${id}`,
        unidad: r.producto?.unit ?? '',
        photo_url: r.producto?.photo_url ?? null,
        cantidad_vendida: 0,
        ingresos: 0,
      })
    }
    const item = map.get(id)!
    item.cantidad_vendida += r.cantidad
    item.ingresos += r.cantidad * r.precio_unit
  }

  return Array.from(map.values())
    .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
    .slice(0, limit)
}
