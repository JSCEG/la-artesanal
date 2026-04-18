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

export interface AlertaStock {
  id: string
  nombre: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  estado: 'agotado' | 'bajo'
}

export interface AlertaCxC {
  cliente_id: string
  nombre_comercial: string
  saldo_vencido: number
  dias_max: number
}

export interface AlertasOperativas {
  stock: AlertaStock[]
  cxc: AlertaCxC[]
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

// ─── Alertas operativas (stock bajo + CxC vencida 30+ días) ──────────────────

export async function getAlertasOperativas(): Promise<AlertasOperativas> {
  const [{ data: insumosData }, { data: pedidosData }, { data: cobrosData }, { data: clientesData }] = await Promise.all([
    supabase
      .from('insumos')
      .select('id, nombre, unidad, stock_actual, stock_minimo')
      .eq('activo', true),
    supabase
      .from('pedidos')
      .select('id, cliente_id, fecha_pedido, pedido_detalle(cantidad, precio_unit)')
      .in('estatus', ['confirmado', 'en_ruta', 'entregado']),
    supabase
      .from('cobros')
      .select('cliente_id, monto'),
    supabase
      .from('clientes')
      .select('id, nombre_comercial'),
  ])

  // Stock bajo/agotado (solo con mínimo definido > 0)
  const stock: AlertaStock[] = (insumosData ?? [])
    .filter((i: any) => i.stock_minimo > 0 && i.stock_actual <= i.stock_minimo)
    .map((i: any) => ({
      id: i.id,
      nombre: i.nombre,
      unidad: i.unidad,
      stock_actual: i.stock_actual,
      stock_minimo: i.stock_minimo,
      estado: i.stock_actual <= 0 ? 'agotado' : 'bajo',
    }))
    .sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'agotado' ? -1 : 1))

  // CxC aging FIFO: por cliente, ordenar pedidos asc, aplicar cobros oldest-first
  const hoy = Date.now()
  const pedidosByCliente = new Map<string, { fecha: string; total: number }[]>()
  for (const p of pedidosData ?? []) {
    const total = ((p as any).pedido_detalle ?? []).reduce(
      (s: number, d: any) => s + d.cantidad * d.precio_unit, 0
    )
    if (total <= 0) continue
    const arr = pedidosByCliente.get((p as any).cliente_id) ?? []
    arr.push({ fecha: (p as any).fecha_pedido, total })
    pedidosByCliente.set((p as any).cliente_id, arr)
  }

  const cobrosByCliente = new Map<string, number>()
  for (const c of cobrosData ?? []) {
    const cid = (c as any).cliente_id
    cobrosByCliente.set(cid, (cobrosByCliente.get(cid) ?? 0) + (c as any).monto)
  }

  const clientesMap = new Map((clientesData ?? []).map((c: any) => [c.id, c.nombre_comercial]))

  const cxc: AlertaCxC[] = []
  for (const [cid, pedidos] of pedidosByCliente) {
    pedidos.sort((a, b) => a.fecha.localeCompare(b.fecha))
    let restante = cobrosByCliente.get(cid) ?? 0
    let vencido = 0
    let diasMax = 0
    for (const p of pedidos) {
      const abono = Math.min(restante, p.total)
      restante -= abono
      const saldo = p.total - abono
      if (saldo <= 0) continue
      const dias = Math.floor((hoy - new Date(p.fecha + 'T12:00:00').getTime()) / 86400000)
      if (dias > 30) {
        vencido += saldo
        if (dias > diasMax) diasMax = dias
      }
    }
    if (vencido > 0) {
      cxc.push({
        cliente_id: cid,
        nombre_comercial: clientesMap.get(cid) ?? 'Sin cliente',
        saldo_vencido: vencido,
        dias_max: diasMax,
      })
    }
  }

  cxc.sort((a, b) => b.saldo_vencido - a.saldo_vencido)

  return { stock, cxc }
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
