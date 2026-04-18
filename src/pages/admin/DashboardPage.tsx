import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { MetricSkeleton, CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import {
  getDashboardMetrics,
  getPedidosRecientes,
  getTopProductos,
  getAlertasOperativas,
  getProductosSinReceta,
  type DashboardMetrics,
  type PedidoReciente,
  type TopProducto,
  type AlertasOperativas,
  type ProductoSinReceta,
} from '../../services/dashboard'
import type { EstatusPedido } from '../../services/pedidos'

// ─── Utils ───────────────────────────────────────────────────────────────────

function fmtMXN(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

function trendPct(actual: number, previo: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (previo === 0) return { pct: actual > 0 ? 100 : 0, dir: actual > 0 ? 'up' : 'flat' }
  const pct = Math.round(((actual - previo) / previo) * 100)
  return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}

const ESTATUS_CFG: Record<EstatusPedido, { label: string; badge: string }> = {
  borrador:   { label: 'Borrador',   badge: 'bg-brand-wood/5 text-brand-wood border-brand-wood/20' },
  confirmado: { label: 'Confirmado', badge: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' },
  en_ruta:    { label: 'En ruta',    badge: 'bg-brand-coral/15 text-brand-coral border-brand-coral/30' },
  entregado:  { label: 'Entregado',  badge: 'bg-brand-teal/15 text-brand-teal border-brand-teal/30' },
  cancelado:  { label: 'Cancelado',  badge: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30' },
}

// ─── Métrica Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  hint: string
  gradient: string
  shadow: string
  icon: ReactNode
  trend?: { pct: number; dir: 'up' | 'down' | 'flat'; label: string }
  href?: string
}

function MetricCard({ label, value, hint, gradient, shadow, icon, trend, href }: MetricCardProps) {
  const content = (
    <div
      className="bg-white rounded-2xl p-5 border border-brand-wood/10 hover:-translate-y-1 hover:shadow-lg transition-all group h-full"
      style={{ boxShadow: `0 4px 20px ${shadow}` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {trend && trend.dir !== 'flat' && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border-2 ${
            trend.dir === 'up'
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
              : 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'
          }`}>
            {trend.dir === 'up' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            )}
            {trend.pct}%
          </span>
        )}
      </div>
      <p className="text-[11px] uppercase tracking-widest text-brand-wood/60 font-bold mb-1">{label}</p>
      <p className="font-display text-3xl font-black text-brand-wood leading-none">{value}</p>
      <p className="text-xs text-brand-wood-soft font-medium mt-2">
        {trend?.label ?? hint}
      </p>
    </div>
  )
  return href ? <Link to={href} className="block">{content}</Link> : content
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useSession()
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recientes, setRecientes] = useState<PedidoReciente[]>([])
  const [topProductos, setTopProductos] = useState<TopProducto[]>([])
  const [alertas, setAlertas] = useState<AlertasOperativas | null>(null)
  const [sinReceta, setSinReceta] = useState<ProductoSinReceta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    async function load() {
      const [m, r, t, a, sr] = await Promise.all([
        getDashboardMetrics(),
        getPedidosRecientes(5),
        getTopProductos(5),
        getAlertasOperativas(),
        getProductosSinReceta(),
      ])
      if (!cancel) {
        setMetrics(m)
        setRecientes(r)
        setTopProductos(t)
        setAlertas(a)
        setSinReceta(sr)
        setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [])

  const trendPedidos = metrics ? trendPct(metrics.pedidosHoy, metrics.pedidosAyer) : null
  const trendIngresos = metrics ? trendPct(metrics.ingresosHoy, metrics.ingresosAyer) : null

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Hero saludo */}
      <div className="relative bg-gradient-to-br from-brand-berry to-brand-berry-soft rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-[0_12px_40px_rgba(177,48,107,0.25)]">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '18px 18px',
          }} />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2">{saludo}</p>
            <h1 className="font-display text-2xl md:text-4xl font-black leading-tight mb-2">
              {profile?.full_name?.split(' ')[0] || 'Equipo'} 👋
            </h1>
            <p className="text-white/90 text-sm md:text-base font-medium max-w-xl">
              Resumen operativo del día — pedidos, ingresos y el estado de la operación.
            </p>
          </div>

          {/* Resumen del mes */}
          {!loading && metrics && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 flex-shrink-0">
              <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold mb-1">Este mes</p>
              <p className="font-display text-2xl font-black">{fmtMXN(metrics.ingresosMes)}</p>
              <p className="text-white/80 text-xs font-semibold mt-0.5">{metrics.pedidosMes} pedidos</p>
            </div>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !metrics
          ? Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
          : (
            <>
              <MetricCard
                label="Pedidos hoy"
                value={metrics.pedidosHoy.toString()}
                hint={`Ayer: ${metrics.pedidosAyer}`}
                gradient="from-brand-berry to-brand-berry-soft"
                shadow="rgba(177,48,107,0.25)"
                href="/admin/pedidos"
                trend={trendPedidos ? { ...trendPedidos, label: `vs ayer (${metrics.pedidosAyer})` } : undefined}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
                }
              />
              <MetricCard
                label="Ingresos hoy"
                value={fmtMXN(metrics.ingresosHoy)}
                hint={`Ayer: ${fmtMXN(metrics.ingresosAyer)}`}
                gradient="from-brand-teal to-brand-teal-soft"
                shadow="rgba(45,102,128,0.25)"
                trend={trendIngresos ? { ...trendIngresos, label: `vs ayer (${fmtMXN(metrics.ingresosAyer)})` } : undefined}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                }
              />
              <MetricCard
                label="Clientes activos"
                value={metrics.clientesActivos.toString()}
                hint="Con al menos 1 pedido"
                gradient="from-brand-coral to-brand-berry-soft"
                shadow="rgba(235,121,111,0.25)"
                href="/admin/clientes"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                }
              />
              <MetricCard
                label="Pedidos pendientes"
                value={metrics.pedidosPendientes.toString()}
                hint="Confirmados o en ruta"
                gradient="from-brand-wood to-brand-wood-soft"
                shadow="rgba(91,56,34,0.25)"
                href="/admin/entregas"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="13" x="1" y="3" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                }
              />
            </>
          )
        }
      </div>

      {/* Alertas operativas */}
      {!loading && alertas && (alertas.stock.length > 0 || alertas.cxc.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Stock bajo / agotado */}
          {alertas.stock.length > 0 && (
            <div className="bg-white rounded-3xl border border-brand-coral/30 shadow-[0_4px_24px_rgba(235,121,111,0.08)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-coral/10 text-brand-coral flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black text-brand-wood leading-tight">Stock crítico</h3>
                    <p className="text-xs text-brand-wood-soft font-semibold">{alertas.stock.length} insumo{alertas.stock.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <Link to="/admin/inventario" className="text-xs font-black uppercase tracking-widest text-brand-coral hover:text-brand-berry transition-colors">
                  Ver
                </Link>
              </div>
              <ul className="space-y-2">
                {alertas.stock.slice(0, 5).map(i => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-brand-wood/5 last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border-2 flex-shrink-0 ${
                        i.estado === 'agotado'
                          ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'
                          : 'bg-brand-coral/10 text-brand-coral border-brand-coral/30'
                      }`}>
                        {i.estado === 'agotado' ? 'AGOTADO' : 'BAJO'}
                      </span>
                      <p className="text-sm font-bold text-brand-wood truncate">{i.nombre}</p>
                    </div>
                    <p className="text-xs font-mono text-brand-wood-soft font-bold flex-shrink-0">
                      {i.stock_actual} / {i.stock_minimo} {i.unidad}
                    </p>
                  </li>
                ))}
              </ul>
              {alertas.stock.length > 5 && (
                <p className="text-[11px] text-brand-wood-soft font-semibold text-center mt-3">
                  +{alertas.stock.length - 5} más en inventario
                </p>
              )}
            </div>
          )}

          {/* CxC vencida 30+ */}
          {alertas.cxc.length > 0 && (
            <div className="bg-white rounded-3xl border border-brand-berry/30 shadow-[0_4px_24px_rgba(177,48,107,0.08)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-berry/10 text-brand-berry flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black text-brand-wood leading-tight">Cobranza vencida</h3>
                    <p className="text-xs text-brand-wood-soft font-semibold">{alertas.cxc.length} cliente{alertas.cxc.length === 1 ? '' : 's'} · +30 días</p>
                  </div>
                </div>
                <Link to="/admin/cobros" className="text-xs font-black uppercase tracking-widest text-brand-berry hover:text-brand-berry-soft transition-colors">
                  Ver
                </Link>
              </div>
              <ul className="space-y-2">
                {alertas.cxc.slice(0, 5).map(c => (
                  <li key={c.cliente_id} className="flex items-center justify-between gap-3 py-1.5 border-b border-brand-wood/5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-brand-wood truncate">{c.nombre_comercial}</p>
                      <p className="text-[11px] text-brand-wood-soft font-semibold">{c.dias_max} días máx.</p>
                    </div>
                    <p className="font-display text-sm font-black text-brand-berry flex-shrink-0">{fmtMXN(c.saldo_vencido)}</p>
                  </li>
                ))}
              </ul>
              {alertas.cxc.length > 5 && (
                <p className="text-[11px] text-brand-wood-soft font-semibold text-center mt-3">
                  +{alertas.cxc.length - 5} más en cobros
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid: Actividad reciente + Top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Actividad reciente ── */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-brand-wood/10 shadow-[0_4px_24px_rgba(177,48,107,0.06)] p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Actividad reciente</h2>
              <p className="text-sm text-brand-wood-soft font-medium mt-0.5">Últimos pedidos registrados</p>
            </div>
            <Link to="/admin/pedidos" className="text-xs font-black uppercase tracking-widest text-brand-berry hover:text-brand-berry-soft transition-colors flex items-center gap-1">
              Ver todos
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : recientes.length === 0 ? (
            <EmptyState
              tone="berry"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              title="Aún no hay pedidos"
              description="Cuando entre el primer pedido, aparecerá aquí con su estado y total."
              action={
                <>
                  <Link to="/admin/catalogo" className="btn-primary text-sm">Ir a Catálogo</Link>
                  <Link to="/admin/clientes" className="btn-secondary text-sm">Ver clientes</Link>
                </>
              }
            />
          ) : (
            <ul className="divide-y divide-brand-wood/5">
              {recientes.map(p => {
                const cfg = ESTATUS_CFG[p.estatus]
                return (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 hover:bg-brand-cream/20 -mx-2 px-2 rounded-xl transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border-2 flex-shrink-0 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <p className="font-bold text-sm text-brand-wood truncate">{p.cliente_nombre}</p>
                      </div>
                      <p className="text-xs text-brand-wood-soft font-medium truncate">
                        {p.sucursal_nombre ?? 'Principal'} · {p.n_productos} {p.n_productos === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-base font-black text-brand-wood">{fmtMXN(p.total)}</p>
                      <p className="text-[10px] text-brand-wood-soft font-semibold">
                        {new Date(p.fecha_pedido + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Top productos del mes ── */}
        <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-[0_4px_24px_rgba(177,48,107,0.06)] p-6 md:p-8">
          <div className="mb-5">
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Top del mes</h2>
            <p className="text-sm text-brand-wood-soft font-medium mt-0.5">Productos más vendidos</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : topProductos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-brand-cream border-2 border-brand-wood/10 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-wood-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <p className="text-sm font-bold text-brand-wood mb-1">Sin ventas este mes</p>
              <p className="text-xs text-brand-wood-soft">Empezá a registrar pedidos y verás aquí lo más vendido.</p>
            </div>
          ) : (
            <ol className="space-y-3">
              {topProductos.map((prod, i) => (
                <li key={prod.producto_id} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                    i === 0 ? 'bg-gradient-to-br from-brand-berry to-brand-coral text-white shadow-md' :
                    i === 1 ? 'bg-brand-teal/10 text-brand-teal border-2 border-brand-teal/30' :
                    i === 2 ? 'bg-brand-wood/10 text-brand-wood border-2 border-brand-wood/30' :
                              'bg-brand-cream text-brand-wood-soft border-2 border-brand-wood/10'
                  }`}>
                    {i + 1}
                  </span>
                  {prod.photo_url ? (
                    <img src={prod.photo_url} alt={prod.nombre} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-brand-wood/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-brand-cream flex items-center justify-center flex-shrink-0 border border-brand-wood/10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-wood-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-brand-wood truncate">{prod.nombre}</p>
                    <p className="text-[10px] text-brand-wood-soft font-semibold">
                      {prod.cantidad_vendida} {prod.unidad} · {fmtMXN(prod.ingresos)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ── Productos vendidos sin receta ── */}
      {!loading && sinReceta.length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-brand-coral/30 shadow-[0_4px_24px_rgba(255,131,107,0.08)] p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-brand-coral/15 text-brand-coral flex items-center justify-center border border-brand-coral/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </span>
                <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Productos sin receta</h2>
              </div>
              <p className="text-sm text-brand-wood-soft font-medium mt-1 ml-10">
                Vendidos este mes pero sin BOM. No descuentan inventario.
              </p>
            </div>
            <Link to="/admin/catalogo" className="text-xs font-black uppercase tracking-widest text-brand-coral hover:opacity-70 flex items-center gap-1">
              Ir al catálogo
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          </div>

          <ul className="divide-y divide-brand-wood/5">
            {sinReceta.slice(0, 8).map(p => (
              <li key={p.producto_id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-brand-wood truncate">{p.nombre}</p>
                  <p className="text-[10px] text-brand-wood-soft font-semibold">
                    {p.cantidad_vendida} {p.unidad} vendidos
                  </p>
                </div>
                <p className="font-display text-sm font-black text-brand-coral flex-shrink-0">{fmtMXN(p.ingresos)}</p>
              </li>
            ))}
          </ul>
          {sinReceta.length > 8 && (
            <p className="text-[11px] text-brand-wood-soft font-bold mt-3 text-center">
              +{sinReceta.length - 8} producto(s) más sin receta
            </p>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-[0_4px_24px_rgba(177,48,107,0.06)] p-6 md:p-8">
        <div className="mb-5">
          <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Accesos rápidos</h2>
          <p className="text-sm text-brand-wood-soft font-medium mt-0.5">Operación diaria</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/admin/pedidos', label: 'Nuevo pedido', tone: 'berry', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg> },
            { to: '/admin/entregas', label: 'Entregar', tone: 'coral', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="13" x="1" y="3" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
            { to: '/admin/clientes', label: 'Clientes', tone: 'teal', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
            { to: '/admin/catalogo', label: 'Catálogo', tone: 'wood', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg> },
          ].map(a => {
            const toneClasses: Record<string, string> = {
              berry: 'hover:border-brand-berry/40 hover:bg-brand-berry/5 text-brand-berry',
              coral: 'hover:border-brand-coral/40 hover:bg-brand-coral/5 text-brand-coral',
              teal:  'hover:border-brand-teal/40 hover:bg-brand-teal/5 text-brand-teal',
              wood:  'hover:border-brand-wood/40 hover:bg-brand-wood/5 text-brand-wood',
            }
            return (
              <Link
                key={a.to}
                to={a.to}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-brand-wood/10 bg-brand-cream/30 transition-all hover:-translate-y-1 hover:shadow-md ${toneClasses[a.tone]}`}
              >
                {a.icon}
                <span className="text-xs font-black uppercase tracking-wide">{a.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
