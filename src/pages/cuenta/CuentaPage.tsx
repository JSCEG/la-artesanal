import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import Navbar from '../../components/Navbar'
import { getPedidos, calcularTotal } from '../../services/pedidos'
import type { Pedido, EstatusPedido } from '../../services/pedidos'
import { supabase } from '../../services/supabase'

// ─── Estatus visual ───────────────────────────────────────────────────────────

const ESTATUS_CFG: Record<EstatusPedido, { label: string; badge: string }> = {
  borrador:   { label: 'Borrador',   badge: 'bg-gray-100 text-gray-500'      },
  confirmado: { label: 'Confirmado', badge: 'bg-blue-100 text-blue-700'       },
  en_ruta:    { label: 'En ruta',    badge: 'bg-amber-100 text-amber-700'     },
  entregado:  { label: 'Entregado',  badge: 'bg-green-100 text-green-700'     },
  cancelado:  { label: 'Cancelado',  badge: 'bg-red-100 text-red-500'         },
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

function fmtFecha(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CuentaPage() {
  const { profile, session, signOut } = useSession()
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)
  const [pedidosOpen, setPedidosOpen] = useState(false)

  async function fetchPedidos() {
    const data = await getPedidos()
    setPedidos(data)
    setLoadingPedidos(false)
  }

  useEffect(() => {
    fetchPedidos()

    // Suscripción en tiempo real — si el admin cambia el estatus, la cliente lo ve al instante
    const channel = supabase
      .channel('cuenta-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => { fetchPedidos() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6">

        {/* Perfil Card — Glass */}
        <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(177,48,107,0.08)] p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center flex-shrink-0 font-black text-2xl md:text-3xl text-white ${
              profile?.commercial_profile === 'mayorista'
                ? 'bg-gradient-to-br from-brand-teal to-brand-teal-soft'
                : 'bg-gradient-to-br from-brand-berry to-brand-berry-soft'
            }`}>
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">
                {profile?.full_name}
              </h1>
              <div className="flex items-center gap-3 mt-3 justify-center md:justify-start flex-wrap">
                <span className={`text-xs font-black px-3 py-1.5 rounded-full border-2 ${
                  profile?.commercial_profile === 'mayorista'
                    ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                    : 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'
                }`}>
                  {profile?.commercial_profile === 'mayorista' ? '🏪 Mayorista' : '🛒 Minorista'}
                </span>
                <span className="text-xs font-medium text-brand-wood-soft">
                  {session?.user?.email}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-brand-wood/10">
            <Link to="/#catalogo"
              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-brand-berry/5 to-transparent border border-brand-berry/20 hover:border-brand-berry/40 hover:shadow-[0_4px_16px_rgba(177,48,107,0.12)] transition-all group">
              <span className="font-bold text-brand-wood group-hover:text-brand-berry transition-colors">Ver catálogo</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-berry/60 group-hover:text-brand-berry group-hover:translate-x-1 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>

            <button onClick={handleSignOut}
              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-red-500/5 to-transparent border border-red-200/30 hover:border-red-300 hover:shadow-[0_4px_16px_rgba(239,68,68,0.08)] transition-all group">
              <span className="font-bold text-brand-wood group-hover:text-red-600 transition-colors">Cerrar sesión</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Mis Pedidos — Glass Card */}
        <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(177,48,107,0.08)] overflow-hidden">
          <button
            onClick={() => setPedidosOpen(v => !v)}
            className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-brand-cream/20 transition-colors group"
          >
            <div>
              <h2 className="font-display text-2xl font-black text-brand-wood">Mis pedidos</h2>
              <p className="text-xs text-brand-wood-soft font-medium mt-1">Historial de tus compras</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {!loadingPedidos && pedidos.length > 0 && (
                <span className="text-xs font-black bg-brand-berry text-white px-3 py-1.5 rounded-full">
                  {pedidos.length}
                </span>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 text-brand-wood/60 transition-transform duration-300 ${pedidosOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          {pedidosOpen && (
            <div className="border-t border-brand-wood/10">
              {loadingPedidos ? (
                <div className="space-y-3 p-6 md:p-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gradient-to-r from-brand-cream to-brand-cream/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : pedidos.length === 0 ? (
                <div className="p-8 md:p-12 text-center">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-lg font-black text-brand-wood mb-2">Sin pedidos todavía</p>
                  <p className="text-sm text-brand-wood-soft mb-6">Cuando hagas tu primer pedido aparecerá aquí con todos los detalles.</p>
                  <Link to="/#catalogo" className="inline-block btn-primary">
                    Explorar catálogo
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-brand-wood/5">
                  {pedidos.map(pedido => {
                    const cfg = ESTATUS_CFG[pedido.estatus]
                    const total = calcularTotal(pedido.detalle ?? [])
                    const nProductos = pedido.detalle?.length ?? 0
                    return (
                      <div key={pedido.id} className="px-6 md:px-8 py-4 hover:bg-brand-cream/30 transition-colors">
                        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 border-2 ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                              {pedido.sucursal && (
                                <span className="text-xs text-brand-wood-soft font-semibold truncate">
                                  📍 {pedido.sucursal.nombre_sucursal}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-brand-wood-soft mb-2">
                              <span className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M16 3v18"/><path d="m9 9 3 3-3 3"/></svg>
                                {fmtFecha(pedido.fecha_pedido)}
                              </span>
                              {pedido.fecha_entrega_programada && (
                                <span className="flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                  {fmtFecha(pedido.fecha_entrega_programada)}
                                </span>
                              )}
                              <span className="font-semibold text-brand-wood">
                                {nProductos} {nProductos === 1 ? 'producto' : 'productos'}
                              </span>
                            </div>
                            {/* Líneas del pedido */}
                            {(pedido.detalle?.length ?? 0) > 0 && (
                              <ul className="mt-3 space-y-1 text-xs">
                                {pedido.detalle!.map(d => (
                                  <li key={d.id} className="text-brand-wood-soft flex justify-between">
                                    <span className="truncate">{d.producto?.name ?? `Producto #${d.producto_id}`}</span>
                                    <span className="flex-shrink-0 ml-3 text-brand-wood font-semibold">
                                      {d.cantidad}x {fmt(d.precio_unit)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {total > 0 && (
                            <div className="text-right flex-shrink-0">
                              <p className="font-display text-xl font-black bg-gradient-to-r from-brand-berry to-brand-berry-soft bg-clip-text text-transparent">
                                {fmt(total)}
                              </p>
                            </div>
                          )}
                        </div>
                        {pedido.notas && (
                          <p className="mt-2 text-xs text-brand-wood-soft italic border-l-2 border-brand-wood/10 pl-2">{pedido.notas}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Placeholder Promociones */}
        <div className="bg-gradient-to-br from-brand-teal/5 to-brand-teal/10 rounded-[2rem] border-2 border-dashed border-brand-teal/30 p-6 md:p-8 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-display text-xl font-black text-brand-wood mb-2">Promociones (próximamente)</h3>
          <p className="text-sm text-brand-wood-soft">Aquí aparecerán tus promociones exclusivas y descuentos especiales.</p>
        </div>

      </div>
    </div>
  )
}
