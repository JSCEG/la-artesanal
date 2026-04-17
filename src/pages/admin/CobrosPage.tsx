import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCobros } from '../../services/pedidos'
import { getClientes } from '../../services/clientes'
import type { Cobro, MetodoCobro } from '../../services/pedidos'
import type { Cliente } from '../../services/clientes'
import { supabase } from '../../services/supabase'
import CobroModal from '../../components/admin/CobroModal'
import { CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import { useToast } from '../../context/ToastContext'

// ─── Config de métodos ───────────────────────────────────────────────────────

const METODO_CFG: Record<MetodoCobro, { label: string; badge: string; icon: ReactNode }> = {
  efectivo: {
    label: 'Efectivo',
    badge: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
      </svg>
    ),
  },
  transferencia: {
    label: 'Transferencia',
    badge: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
  },
  tarjeta: {
    label: 'Tarjeta',
    badge: 'bg-brand-coral/15 text-brand-coral border-brand-coral/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
      </svg>
    ),
  },
  stripe: {
    label: 'Stripe',
    badge: 'bg-brand-wood/10 text-brand-wood border-brand-wood/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
      </svg>
    ),
  },
  paypal: {
    label: 'PayPal',
    badge: 'bg-brand-wood/10 text-brand-wood border-brand-wood/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
      </svg>
    ),
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

// fecha_cobro puede venir como 'YYYY-MM-DD' o como timestamp ISO completo
function parseFecha(iso: string): Date {
  if (!iso) return new Date(NaN)
  // Si ya trae hora (T, Z, :) parseamos directo; si no, añadimos hora mediodía
  return iso.includes('T') || iso.includes(':') ? new Date(iso) : new Date(iso + 'T12:00:00')
}

function fmtFecha(iso: string) {
  const d = parseFecha(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
}

function isToday(iso: string): boolean {
  const d = parseFecha(iso)
  if (isNaN(d.getTime())) return false
  const hoy = new Date()
  return d.getFullYear() === hoy.getFullYear()
      && d.getMonth()   === hoy.getMonth()
      && d.getDate()    === hoy.getDate()
}

function isThisMonth(iso: string): boolean {
  const d = parseFecha(iso)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function CobrosPage() {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [saldoCxC, setSaldoCxC] = useState(0)
  const [loading, setLoading] = useState(true)

  const [filtroMetodo, setFiltroMetodo] = useState<MetodoCobro | 'todos'>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'hoy' | 'mes'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const toast = useToast()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [cs, cls] = await Promise.all([getCobros(), getClientes()])
      setCobros(cs)
      setClientes(cls)

      // Calcular CxC total (una query agregada)
      const [{ data: pedidosAgg }, { data: cobrosAgg }] = await Promise.all([
        supabase
          .from('pedido_detalle')
          .select('cantidad, precio_unit, pedido:pedidos!inner(estatus)')
          .in('pedido.estatus', ['confirmado', 'en_ruta', 'entregado']),
        supabase.from('cobros').select('monto'),
      ])
      const totalPedidos = (pedidosAgg ?? []).reduce((s: number, r: any) => s + r.cantidad * r.precio_unit, 0)
      const totalCobrado = (cobrosAgg ?? []).reduce((s: number, r: any) => s + r.monto, 0)
      setSaldoCxC(Math.max(0, totalPedidos - totalCobrado))
    } catch {
      toast.error('No se pudieron cargar los cobros')
    } finally {
      setLoading(false)
    }
  }

  // ─── Métricas ────────────────────────────────────────────────────────────
  const metricas = useMemo(() => {
    const hoy = cobros.filter(c => isToday(c.fecha_cobro))
    const mes = cobros.filter(c => isThisMonth(c.fecha_cobro))
    return {
      hoyMonto: hoy.reduce((s, c) => s + c.monto, 0),
      hoyCount: hoy.length,
      mesMonto: mes.reduce((s, c) => s + c.monto, 0),
      mesCount: mes.length,
    }
  }, [cobros])

  // ─── Filtrado ────────────────────────────────────────────────────────────
  const filtrados = useMemo(() => cobros.filter(c => {
    const q = busqueda.toLowerCase()
    const nombre = (c.cliente?.nombre_comercial ?? '').toLowerCase()
    const ref = (c.referencia ?? '').toLowerCase()
    const coincide = !q || nombre.includes(q) || ref.includes(q)
    const metodoOk = filtroMetodo === 'todos' || c.metodo === filtroMetodo
    const periodoOk = filtroPeriodo === 'todos'
      || (filtroPeriodo === 'hoy' && isToday(c.fecha_cobro))
      || (filtroPeriodo === 'mes' && isThisMonth(c.fecha_cobro))
    return coincide && metodoOk && periodoOk
  }), [cobros, busqueda, filtroMetodo, filtroPeriodo])

  const totalFiltrado = filtrados.reduce((s, c) => s + c.monto, 0)

  const totalesPorMetodo = useMemo(() => {
    const t: Partial<Record<MetodoCobro, number>> = {}
    for (const c of cobros) t[c.metodo] = (t[c.metodo] ?? 0) + 1
    return t
  }, [cobros])

  // Antigüedad CxC: FIFO cobros → pedidos ordenados por fecha
  type Bucket = '0-7' | '8-15' | '16-30' | '31+'
  const [aging, setAging] = useState<Record<Bucket, { monto: number; count: number }>>({
    '0-7':   { monto: 0, count: 0 },
    '8-15':  { monto: 0, count: 0 },
    '16-30': { monto: 0, count: 0 },
    '31+':   { monto: 0, count: 0 },
  })

  // Clientes con saldo (top deudores)
  const [topDeudores, setTopDeudores] = useState<{ cliente: Cliente; saldo: number }[]>([])
  useEffect(() => {
    if (clientes.length === 0) return
    ;(async () => {
      // Hacemos una sola query agregada por cliente: pedidos confirmados/entregados
      const { data: pedidosAll } = await supabase
        .from('pedido_detalle')
        .select('cantidad, precio_unit, pedido:pedidos!inner(cliente_id, estatus)')
        .in('pedido.estatus', ['confirmado', 'en_ruta', 'entregado'])
      const totalPorCliente: Record<string, number> = {}
      for (const r of (pedidosAll ?? []) as any[]) {
        const cid = r.pedido?.cliente_id
        if (!cid) continue
        totalPorCliente[cid] = (totalPorCliente[cid] ?? 0) + r.cantidad * r.precio_unit
      }
      const { data: cobrosAll } = await supabase.from('cobros').select('cliente_id, monto')
      const cobradoPorCliente: Record<string, number> = {}
      for (const r of (cobrosAll ?? []) as any[]) {
        cobradoPorCliente[r.cliente_id] = (cobradoPorCliente[r.cliente_id] ?? 0) + r.monto
      }
      const deudores = clientes
        .map(c => ({ cliente: c, saldo: (totalPorCliente[c.id] ?? 0) - (cobradoPorCliente[c.id] ?? 0) }))
        .filter(x => x.saldo > 0)
        .sort((a, b) => b.saldo - a.saldo)
        .slice(0, 5)
      setTopDeudores(deudores)

      // ── Antigüedad: FIFO por cliente ──
      const { data: pedidosDet } = await supabase
        .from('pedido_detalle')
        .select('cantidad, precio_unit, pedido:pedidos!inner(id, cliente_id, fecha_pedido, estatus)')
        .in('pedido.estatus', ['confirmado', 'en_ruta', 'entregado'])
      // Agrupa total por pedido
      const pedidosMap = new Map<string, { cliente_id: string; fecha: string; total: number }>()
      for (const r of (pedidosDet ?? []) as any[]) {
        const p = r.pedido
        if (!p?.id) continue
        const prev = pedidosMap.get(p.id)
        const monto = r.cantidad * r.precio_unit
        if (prev) prev.total += monto
        else pedidosMap.set(p.id, { cliente_id: p.cliente_id, fecha: p.fecha_pedido, total: monto })
      }
      // Por cliente, ordenar pedidos asc por fecha y aplicar FIFO
      const porCliente = new Map<string, { id: string; fecha: string; total: number }[]>()
      for (const [id, v] of pedidosMap) {
        if (!porCliente.has(v.cliente_id)) porCliente.set(v.cliente_id, [])
        porCliente.get(v.cliente_id)!.push({ id, fecha: v.fecha, total: v.total })
      }
      const buckets: Record<Bucket, { monto: number; count: number }> = {
        '0-7':   { monto: 0, count: 0 },
        '8-15':  { monto: 0, count: 0 },
        '16-30': { monto: 0, count: 0 },
        '31+':   { monto: 0, count: 0 },
      }
      const hoy = Date.now()
      for (const [cid, pedidos] of porCliente) {
        pedidos.sort((a, b) => a.fecha.localeCompare(b.fecha))
        let restante = cobradoPorCliente[cid] ?? 0
        for (const p of pedidos) {
          const pagado = Math.min(restante, p.total)
          restante -= pagado
          const saldo = p.total - pagado
          if (saldo <= 0.01) continue
          const dias = Math.floor((hoy - parseFecha(p.fecha).getTime()) / 86400000)
          const b: Bucket = dias <= 7 ? '0-7' : dias <= 15 ? '8-15' : dias <= 30 ? '16-30' : '31+'
          buckets[b].monto += saldo
          buckets[b].count += 1
        }
      }
      setAging(buckets)
    })()
  }, [clientes, cobros])

  const hayFiltro = busqueda.trim() !== '' || filtroMetodo !== 'todos' || filtroPeriodo !== 'todos'

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Cobros</h1>
          <p className="text-sm text-brand-wood-soft font-medium mt-1">
            {cobros.length} {cobros.length === 1 ? 'cobro registrado' : 'cobros registrados'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Registrar cobro
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Cobrado hoy</p>
          <p className="font-display text-2xl font-black text-brand-teal mt-1">{fmt(metricas.hoyMonto)}</p>
          <p className="text-xs text-brand-wood-soft mt-0.5">
            {metricas.hoyCount} {metricas.hoyCount === 1 ? 'pago' : 'pagos'}
          </p>
        </div>
        <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Cobrado este mes</p>
          <p className="font-display text-2xl font-black text-brand-berry mt-1">{fmt(metricas.mesMonto)}</p>
          <p className="text-xs text-brand-wood-soft mt-0.5">
            {metricas.mesCount} {metricas.mesCount === 1 ? 'pago' : 'pagos'}
          </p>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-brand-coral/15 to-brand-coral/5 border-2 border-brand-coral/25 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-coral">Cuentas por cobrar</p>
          <p className="font-display text-2xl font-black text-brand-coral mt-1">{fmt(saldoCxC)}</p>
          <p className="text-xs text-brand-wood-soft mt-0.5">
            Saldo total pendiente
          </p>
        </div>
      </div>

      {/* Top deudores */}
      {!loading && topDeudores.length > 0 && (
        <div className="bg-gradient-to-br from-brand-cream/70 to-white border border-brand-wood/10 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-black text-brand-wood/70 uppercase tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-brand-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            Top deudores
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {topDeudores.map(({ cliente, saldo }) => (
              <div key={cliente.id} className="bg-white border border-brand-wood/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-brand-wood truncate">{cliente.nombre_comercial}</p>
                  <p className="text-[10px] text-brand-wood-soft uppercase tracking-wider">{cliente.tipo}</p>
                </div>
                <p className="font-display text-sm font-black text-brand-coral flex-shrink-0">{fmt(saldo)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Antigüedad CxC */}
      {!loading && (aging['0-7'].count + aging['8-15'].count + aging['16-30'].count + aging['31+'].count) > 0 && (
        <div className="bg-white border border-brand-wood/10 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-black text-brand-wood/70 uppercase tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-brand-berry" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Antigüedad de cuentas por cobrar
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {([
              { key: '0-7'   as const, label: 'Al día',  sub: '0–7 días',   tone: 'teal'   },
              { key: '8-15'  as const, label: '8–15 d',  sub: 'Reciente',    tone: 'coral'  },
              { key: '16-30' as const, label: '16–30 d', sub: 'Atrasado',    tone: 'berry'  },
              { key: '31+'   as const, label: '31+ d',   sub: 'Crítico',     tone: 'wood'   },
            ]).map(b => {
              const v = aging[b.key]
              const cls =
                b.tone === 'teal'  ? 'bg-brand-teal/5 border-brand-teal/25 text-brand-teal'   :
                b.tone === 'coral' ? 'bg-brand-coral/10 border-brand-coral/30 text-brand-coral' :
                b.tone === 'berry' ? 'bg-brand-berry/10 border-brand-berry/30 text-brand-berry' :
                                     'bg-brand-wood/10 border-brand-wood/30 text-brand-wood'
              return (
                <div key={b.key} className={`rounded-xl border px-3 py-2.5 ${cls}`}>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{b.label}</p>
                  <p className="font-display text-xl font-black mt-0.5">{fmt(v.monto)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mt-0.5">
                    {v.count} {v.count === 1 ? 'pedido' : 'pedidos'} · {b.sub}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros: periodo */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['todos', 'hoy', 'mes'] as const).map(p => (
          <button
            key={p}
            onClick={() => setFiltroPeriodo(p)}
            className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${
              filtroPeriodo === p
                ? 'bg-brand-wood text-white border-brand-wood shadow-[2px_2px_0_rgba(91,56,34,0.25)]'
                : 'bg-white text-brand-wood border-brand-wood/15 hover:border-brand-wood/40'
            }`}
          >
            {p === 'todos' ? 'Todos' : p === 'hoy' ? 'Hoy' : 'Este mes'}
          </button>
        ))}
        <span className="w-px h-5 bg-brand-wood/15 mx-1" />
        <button
          onClick={() => setFiltroMetodo('todos')}
          className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${
            filtroMetodo === 'todos'
              ? 'bg-brand-wood text-white border-brand-wood shadow-[2px_2px_0_rgba(91,56,34,0.25)]'
              : 'bg-white text-brand-wood border-brand-wood/15 hover:border-brand-wood/40'
          }`}
        >
          Todos los métodos
        </button>
        {(['efectivo', 'transferencia', 'tarjeta'] as const).map(m => {
          const cfg = METODO_CFG[m]
          const count = totalesPorMetodo[m] ?? 0
          if (count === 0) return null
          return (
            <button
              key={m}
              onClick={() => setFiltroMetodo(filtroMetodo === m ? 'todos' : m)}
              className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${cfg.badge} ${
                filtroMetodo === m ? 'ring-2 ring-offset-1 ring-current' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {cfg.icon}
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por cliente o referencia…"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="input w-full"
      />

      {/* Total del filtro */}
      {!loading && filtrados.length > 0 && (
        <div className="flex items-center justify-between bg-brand-cream/50 border border-brand-wood/10 rounded-xl px-4 py-2">
          <p className="text-xs font-bold text-brand-wood-soft">
            {filtrados.length} {filtrados.length === 1 ? 'cobro' : 'cobros'} mostrados
          </p>
          <p className="font-display text-lg font-black text-brand-berry">{fmt(totalFiltrado)}</p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          tone="teal"
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="2" y2="22"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          )}
          title={hayFiltro ? 'Sin resultados' : 'Aún no hay cobros'}
          description={hayFiltro
            ? 'Probá cambiar los filtros o el término de búsqueda.'
            : 'Registrá el primer cobro desde el botón de arriba, o directo desde una entrega.'}
          action={hayFiltro ? (
            <button onClick={() => { setFiltroMetodo('todos'); setFiltroPeriodo('todos'); setBusqueda('') }} className="btn-secondary text-sm">Limpiar filtros</button>
          ) : (
            <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">Registrar cobro</button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtrados.map(cobro => {
            const cfg = METODO_CFG[cobro.metodo] ?? METODO_CFG.efectivo
            return (
              <div key={cobro.id} className="bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] px-4 py-3 flex items-center gap-3">

                {/* Icono método */}
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                  {cfg.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-brand-wood truncate">
                      {cobro.cliente?.nombre_comercial ?? '—'}
                    </p>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-brand-wood-soft flex-wrap">
                    <span>{fmtFecha(cobro.fecha_cobro)}</span>
                    {cobro.pedido?.fecha_pedido && (
                      <span>· Pedido {fmtFecha(cobro.pedido.fecha_pedido)}</span>
                    )}
                    {!cobro.pedido && (
                      <span className="italic">· Abono a cuenta</span>
                    )}
                    {cobro.referencia && (
                      <span className="font-mono text-[11px]">Ref: {cobro.referencia}</span>
                    )}
                  </div>
                  {cobro.notas && (
                    <p className="text-xs text-brand-wood-soft italic mt-1 truncate">{cobro.notas}</p>
                  )}
                </div>

                {/* Monto */}
                <p className="font-display text-lg font-black text-brand-berry flex-shrink-0">
                  {fmt(cobro.monto)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CobroModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); toast.success('Cobro registrado'); fetchAll() }}
        />
      )}
    </div>
  )
}
