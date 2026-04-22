import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import Navbar from '../../components/Navbar'
import { getPedidos, getEntregas, getCobros, calcularTotal } from '../../services/pedidos'
import type { Pedido, EstatusPedido, Entrega, Cobro, EstatusEntrega, MetodoCobro } from '../../services/pedidos'
import { getMiCliente } from '../../services/clientes'
import type { Cliente } from '../../services/clientes'
import { supabase } from '../../services/supabase'
import { CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import { useToast } from '../../context/ToastContext'
import ResurtidoModal from './ResurtidoModal'

// ─── Config visual ────────────────────────────────────────────────────────────

const ESTATUS_CFG: Record<EstatusPedido, { label: string; badge: string }> = {
  borrador:   { label: 'Borrador',   badge: 'bg-brand-wood/5 text-brand-wood-soft border-brand-wood/15' },
  confirmado: { label: 'Confirmado', badge: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'     },
  en_ruta:    { label: 'En ruta',    badge: 'bg-brand-coral/15 text-brand-coral border-brand-coral/30'  },
  entregado:  { label: 'Entregado',  badge: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'  },
  cancelado:  { label: 'Cancelado',  badge: 'bg-gray-100 text-gray-500 border-gray-200'                 },
}

const ENTREGA_CFG: Record<EstatusEntrega, { label: string; badge: string }> = {
  pendiente: { label: 'Pendiente', badge: 'bg-brand-wood/5 text-brand-wood-soft border-brand-wood/15' },
  parcial:   { label: 'Parcial',   badge: 'bg-brand-coral/15 text-brand-coral border-brand-coral/30' },
  completa:  { label: 'Completa',  badge: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30' },
  fallida:   { label: 'Fallida',   badge: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const METODO_LABEL: Record<MetodoCobro, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  stripe: 'Stripe',
  paypal: 'PayPal',
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

function fmtFecha(iso: string) {
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Tab = 'pedidos' | 'entregas' | 'pagos'

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CuentaPage() {
  const { profile, session, signOut } = useSession()
  const navigate = useNavigate()
  const toast = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<Tab>('pedidos')
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusPedido | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resurtidoOpen, setResurtidoOpen] = useState(false)

  const isMayorista = profile?.commercial_profile === 'mayorista'

  async function fetchAll() {
    if (!session?.user?.email) return
    setLoading(true)
    try {
      const [cli, peds, ents, cobs] = await Promise.all([
        isMayorista ? getMiCliente(session.user.email) : Promise.resolve(null),
        getPedidos(),
        isMayorista ? getEntregas() : Promise.resolve([]),
        isMayorista ? getCobros() : Promise.resolve([]),
      ])
      setCliente(cli)
      setPedidos(peds)
      setEntregas(ents)
      setCobros(cobs)
    } catch {
      toast.error('No se pudieron cargar tus datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => { await fetchAll() })()

    if (!session?.user) return () => { active = false }

    const channel = supabase
      .channel(`cuenta-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => { if (active) fetchAll() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => { if (active) fetchAll() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobros' }, () => { if (active) fetchAll() })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id, isMayorista])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // ─── Saldo (solo mayorista con cliente vinculado) ─────────────────────────
  const saldo = useMemo(() => {
    if (!isMayorista) return null
    const totalPedidos = pedidos
      .filter(p => ['confirmado', 'en_ruta', 'entregado'].includes(p.estatus))
      .reduce((s, p) => s + calcularTotal(p.detalle ?? []), 0)
    const totalCobrado = cobros.reduce((s, c) => s + Number(c.monto), 0)
    return {
      total_pedidos: totalPedidos,
      total_cobrado: totalCobrado,
      saldo: totalPedidos - totalCobrado,
      limite: cliente?.limite_credito ?? 0,
    }
  }, [isMayorista, pedidos, cobros, cliente])

  const metricas = useMemo(() => ({
    totalCount: pedidos.length,
    pendientesCount: pedidos.filter(p => p.estatus === 'confirmado' || p.estatus === 'en_ruta').length,
    entregadosCount: pedidos.filter(p => p.estatus === 'entregado').length,
  }), [pedidos])

  const pedidosFiltrados = useMemo(() => pedidos.filter(p => {
    const estatusOk = filtroEstatus === 'todos' || p.estatus === filtroEstatus
    const q = busqueda.trim().toLowerCase()
    if (!q) return estatusOk
    const suc = (p.sucursal?.nombre_sucursal ?? '').toLowerCase()
    const notas = (p.notas ?? '').toLowerCase()
    return estatusOk && (suc.includes(q) || notas.includes(q) || p.id.toLowerCase().includes(q))
  }), [pedidos, filtroEstatus, busqueda])

  const hayFiltro = filtroEstatus !== 'todos' || busqueda.trim() !== ''

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Mi cuenta</h1>
            <p className="text-sm text-brand-wood-soft font-medium mt-1">
              {profile?.full_name ?? '—'} · {session?.user?.email ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/#catalogo" className="btn-secondary !py-2 !px-4 text-sm">Ver catálogo</Link>
            <button onClick={handleSignOut} className="btn-primary !py-2 !px-4 text-sm">Salir</button>
          </div>
        </div>

        {/* Perfil */}
        <div className="bg-white border border-brand-wood/10 rounded-2xl p-5 md:p-6 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xl text-white ${
              isMayorista
                ? 'bg-gradient-to-br from-brand-teal to-brand-teal-soft'
                : 'bg-gradient-to-br from-brand-berry to-brand-berry-soft'
            }`}>
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-brand-wood-soft">Perfil comercial</p>
              <p className="font-bold text-brand-wood mt-1 truncate">
                {isMayorista ? 'Mayorista' : 'Minorista'}
                {cliente?.nombre_comercial && <> · {cliente.nombre_comercial}</>}
              </p>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
              isMayorista
                ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                : 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'
            }`}>
              {isMayorista ? '🏪' : '🛒'}
            </span>
          </div>
        </div>

        {/* Saldo mayorista */}
        {isMayorista && saldo && cliente && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Total facturado</p>
              <p className="font-display text-2xl font-black text-brand-wood mt-1">{fmt(saldo.total_pedidos)}</p>
            </div>
            <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Pagado</p>
              <p className="font-display text-2xl font-black text-brand-teal mt-1">{fmt(saldo.total_cobrado)}</p>
            </div>
            <div className={`rounded-2xl px-4 py-3 border-2 ${
              saldo.saldo > 0
                ? 'bg-gradient-to-br from-brand-coral/10 to-brand-cream border-brand-coral/30'
                : 'bg-gradient-to-br from-brand-berry/10 to-brand-cream border-brand-berry/20'
            }`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Saldo por pagar</p>
              <p className={`font-display text-2xl font-black mt-1 ${saldo.saldo > 0 ? 'text-brand-coral' : 'text-brand-berry'}`}>
                {fmt(saldo.saldo)}
              </p>
              {saldo.limite > 0 && (
                <p className="text-[10px] text-brand-wood-soft mt-0.5">Límite crédito: {fmt(saldo.limite)}</p>
              )}
            </div>
          </div>
        )}

        {/* Métricas pedidos */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Pedidos</p>
            <p className="font-display text-2xl font-black text-brand-wood mt-1">{metricas.totalCount}</p>
          </div>
          <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Pendientes</p>
            <p className="font-display text-2xl font-black text-brand-coral mt-1">{metricas.pendientesCount}</p>
          </div>
          <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Entregados</p>
            <p className="font-display text-2xl font-black text-brand-berry mt-1">{metricas.entregadosCount}</p>
          </div>
        </div>

        {/* Tabs mayorista / solo pedidos minorista */}
        {isMayorista && (
          <div className="flex items-center gap-1 bg-white border border-brand-wood/10 rounded-2xl p-1 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
            {(['pedidos','entregas','pagos'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs md:text-sm font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${
                  tab === t ? 'bg-brand-wood text-white shadow-[2px_2px_0_rgba(91,56,34,0.25)]' : 'text-brand-wood-soft hover:text-brand-wood'
                }`}
              >
                {t === 'pedidos' && `Pedidos (${pedidos.length})`}
                {t === 'entregas' && `Entregas (${entregas.length})`}
                {t === 'pagos' && `Pagos (${cobros.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Contenido según tab */}
        {(tab === 'pedidos' || !isMayorista) && (
          <div className="bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] overflow-hidden">
            <div className="p-5 md:p-6 border-b border-brand-wood/5">
              <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Mis pedidos</h2>
              <p className="text-xs text-brand-wood-soft font-medium mt-1">Historial de tus compras</p>

              <div className="flex items-center gap-2 flex-wrap mt-4">
                <button
                  onClick={() => setFiltroEstatus('todos')}
                  className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${
                    filtroEstatus === 'todos'
                      ? 'bg-brand-wood text-white border-brand-wood shadow-[2px_2px_0_rgba(91,56,34,0.25)]'
                      : 'bg-white text-brand-wood border-brand-wood/15 hover:border-brand-wood/40'
                  }`}
                >
                  Todos ({pedidos.length})
                </button>
                {(Object.entries(ESTATUS_CFG) as [EstatusPedido, typeof ESTATUS_CFG[EstatusPedido]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFiltroEstatus(filtroEstatus === key ? 'todos' : key)}
                    className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${cfg.badge} ${
                      filtroEstatus === key ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Buscar por sucursal, notas o folio…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="input w-full mt-4"
              />
            </div>

            <div className="p-4 md:p-5">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : pedidosFiltrados.length === 0 ? (
                <EmptyState
                  tone="berry"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 9 3 3-3 3"/><path d="M16 3v18"/></svg>}
                  title={hayFiltro ? 'Sin resultados' : 'Sin pedidos todavía'}
                  description={hayFiltro
                    ? 'Probá cambiar el filtro o el término de búsqueda.'
                    : 'Cuando hagas tu primer pedido aparecerá aquí con todos los detalles.'}
                  action={hayFiltro ? (
                    <button onClick={() => { setFiltroEstatus('todos'); setBusqueda('') }} className="btn-secondary text-sm">Limpiar filtros</button>
                  ) : (
                    <Link to="/#catalogo" className="btn-primary text-sm">Explorar catálogo</Link>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  {pedidosFiltrados.map(pedido => {
                    const cfg = ESTATUS_CFG[pedido.estatus]
                    const total = calcularTotal(pedido.detalle ?? [])
                    const nProd = pedido.detalle?.length ?? 0
                    const isExpanded = expandedId === pedido.id

                    return (
                      <div key={pedido.id} className="bg-white rounded-2xl border border-brand-wood/10 overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
                          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-brand-cream/30 transition-colors"
                        >
                          <span className="text-brand-wood-soft flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-brand-wood truncate">Pedido</p>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-brand-wood-soft flex-wrap">
                              <span>{fmtFecha(pedido.fecha_pedido)}</span>
                              {pedido.sucursal?.nombre_sucursal && <span>· {pedido.sucursal.nombre_sucursal}</span>}
                              {pedido.fecha_entrega_programada && <span>· Entrega {fmtFecha(pedido.fecha_entrega_programada)}</span>}
                              <span>{nProd} {nProd === 1 ? 'producto' : 'productos'}</span>
                              {total > 0 && <span className="text-brand-wood font-black">{fmt(total)}</span>}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-brand-wood/5 bg-brand-cream/20 px-4 py-3 space-y-3">
                            {pedido.notas && (
                              <p className="text-xs text-brand-wood-soft italic">{pedido.notas}</p>
                            )}

                            {(pedido.detalle?.length ?? 0) === 0 ? (
                              <p className="text-xs text-brand-wood-soft italic">Sin detalle de productos</p>
                            ) : (
                              <div className="space-y-2">
                                {pedido.detalle!.map(d => (
                                  <div key={d.id} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-brand-wood/10 flex-shrink-0 overflow-hidden">
                                      {d.producto?.photo_url ? (
                                        <img src={d.producto.photo_url} alt={d.producto.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brand-wood-soft">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-brand-wood truncate">{d.producto?.name ?? `Producto #${d.producto_id}`}</p>
                                      <p className="text-xs text-brand-wood-soft">
                                        {d.cantidad} × {fmt(d.precio_unit)}
                                      </p>
                                    </div>
                                    <p className="text-sm font-black text-brand-wood">{fmt(d.cantidad * d.precio_unit)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Entregas */}
        {isMayorista && tab === 'entregas' && (
          <div className="bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] overflow-hidden">
            <div className="p-5 md:p-6 border-b border-brand-wood/5">
              <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Mis entregas</h2>
              <p className="text-xs text-brand-wood-soft font-medium mt-1">Lo que hemos entregado en tu sucursal</p>
            </div>
            <div className="p-4 md:p-5">
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              ) : entregas.length === 0 ? (
                <EmptyState
                  tone="berry"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3 2 8v10l10 5 10-5V8l-10-5Z"/><path d="m2 8 10 5 10-5"/><path d="M12 13v10"/></svg>}
                  title="Sin entregas registradas"
                  description="Cuando te entreguemos productos aparecerán aquí."
                />
              ) : (
                <div className="space-y-2">
                  {entregas.map(e => {
                    const cfg = ENTREGA_CFG[e.estatus]
                    const total = (e.detalle ?? []).reduce((s, d) => s + d.cantidad * d.precio_unit, 0)
                    return (
                      <div key={e.id} className="rounded-2xl border border-brand-wood/10 p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-brand-wood">Entrega {fmtFecha(e.fecha_entrega)}</p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-brand-wood-soft flex-wrap">
                          {e.entregado_por && <span>por {e.entregado_por}</span>}
                          <span>· {e.detalle?.length ?? 0} productos</span>
                          {total > 0 && <span className="text-brand-wood font-black">· {fmt(total)}</span>}
                        </div>
                        {e.notas && <p className="text-xs text-brand-wood-soft italic mt-2">{e.notas}</p>}
                        {e.foto_url && (
                          <a href={e.foto_url} target="_blank" rel="noreferrer" className="block mt-3">
                            <img src={e.foto_url} alt="Foto entrega" className="w-full max-h-48 object-cover rounded-xl border border-brand-wood/10" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Pagos */}
        {isMayorista && tab === 'pagos' && (
          <div className="bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] overflow-hidden">
            <div className="p-5 md:p-6 border-b border-brand-wood/5">
              <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Mis pagos</h2>
              <p className="text-xs text-brand-wood-soft font-medium mt-1">Historial de cobros aplicados a tu cuenta</p>
            </div>
            <div className="p-4 md:p-5">
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              ) : cobros.length === 0 ? (
                <EmptyState
                  tone="berry"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>}
                  title="Sin pagos registrados"
                  description="Aquí verás cada abono a tu cuenta."
                />
              ) : (
                <div className="space-y-2">
                  {cobros.map(c => (
                    <div key={c.id} className="rounded-2xl border border-brand-wood/10 p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-brand-wood">{METODO_LABEL[c.metodo]}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-brand-wood-soft flex-wrap">
                          <span>{fmtFecha(c.fecha_cobro)}</span>
                          {c.referencia && <span>· Ref. {c.referencia}</span>}
                        </div>
                        {c.notas && <p className="text-xs text-brand-wood-soft italic mt-1">{c.notas}</p>}
                      </div>
                      <p className="font-display text-xl font-black text-brand-teal">{fmt(c.monto)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isMayorista && cliente && (
          <div className="bg-gradient-to-br from-brand-teal/10 to-brand-cream rounded-[2rem] border-2 border-brand-teal/20 p-6 md:p-8 text-center">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="font-display text-xl font-black text-brand-wood mb-2">Solicitar resurtido</h3>
            <p className="text-sm text-brand-wood-soft mb-4">Pide productos directo desde aquí. Confirmaremos disponibilidad y te avisaremos.</p>
            <button onClick={() => setResurtidoOpen(true)} className="btn-primary">Nuevo pedido</button>
          </div>
        )}

      </div>

      {isMayorista && cliente && session?.user?.id && (
        <ResurtidoModal
          open={resurtidoOpen}
          onClose={() => setResurtidoOpen(false)}
          onCreated={fetchAll}
          cliente={cliente}
          userId={session.user.id}
        />
      )}
    </div>
  )
}
