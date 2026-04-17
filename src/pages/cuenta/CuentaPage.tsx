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
  const { profile, signOut } = useSession()
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
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">

        {/* Tarjeta perfil */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-brand-berry flex items-center justify-center">
              <span className="text-white font-black text-xl">
                {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-black text-brand-coffee">{profile?.full_name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  profile?.commercial_profile === 'mayorista'
                    ? 'bg-brand-ocean/10 text-brand-ocean'
                    : 'bg-brand-berry/10 text-brand-berry'
                }`}>
                  {profile?.commercial_profile === 'mayorista' ? 'Mayorista' : 'Minorista'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link to="/#catalogo"
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-berry transition-colors group">
              <span className="font-semibold text-gray-700 group-hover:text-brand-berry">Ver catálogo</span>
              <span className="text-gray-400">→</span>
            </Link>

            {/* Mis pedidos — accordion */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setPedidosOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-700">Mis pedidos</span>
                <div className="flex items-center gap-2">
                  {!loadingPedidos && pedidos.length > 0 && (
                    <span className="text-xs font-bold bg-brand-ocean/10 text-brand-ocean px-2 py-0.5 rounded-full">
                      {pedidos.length}
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">{pedidosOpen ? '∧' : '∨'}</span>
                </div>
              </button>

              {pedidosOpen && (
                <div className="border-t border-gray-100">
                  {loadingPedidos ? (
                    <div className="space-y-2 p-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : pedidos.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-2xl mb-2">📋</p>
                      <p className="text-sm text-gray-500 font-semibold">Sin pedidos todavía</p>
                      <p className="text-xs text-gray-400 mt-1">Cuando hagamos tu primer pedido aparecerá aquí</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {pedidos.map(pedido => {
                        const cfg = ESTATUS_CFG[pedido.estatus]
                        const total = calcularTotal(pedido.detalle ?? [])
                        const nProductos = pedido.detalle?.length ?? 0
                        return (
                          <div key={pedido.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                                    {cfg.label}
                                  </span>
                                  {pedido.sucursal && (
                                    <span className="text-xs text-gray-500 truncate">
                                      🏪 {pedido.sucursal.nombre_sucursal}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                                  <span>📅 {fmtFecha(pedido.fecha_pedido)}</span>
                                  {pedido.fecha_entrega_programada && (
                                    <span>→ entrega {fmtFecha(pedido.fecha_entrega_programada)}</span>
                                  )}
                                  <span>{nProductos} {nProductos === 1 ? 'producto' : 'productos'}</span>
                                </div>
                                {/* Líneas del pedido */}
                                {(pedido.detalle?.length ?? 0) > 0 && (
                                  <ul className="mt-2 space-y-0.5">
                                    {pedido.detalle!.map(d => (
                                      <li key={d.id} className="text-xs text-gray-500 flex justify-between">
                                        <span className="truncate">{d.producto?.name ?? `Producto #${d.producto_id}`}</span>
                                        <span className="flex-shrink-0 ml-3 text-gray-400">
                                          {d.cantidad} × {fmt(d.precio_unit)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {total > 0 && (
                                <p className="text-sm font-black text-brand-coffee flex-shrink-0">{fmt(total)}</p>
                              )}
                            </div>
                            {pedido.notas && (
                              <p className="mt-1.5 text-xs text-gray-400 italic">{pedido.notas}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 opacity-50">
              <span className="font-semibold text-gray-500">Mis promociones</span>
              <span className="text-xs text-gray-400">Próximamente</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full mt-8 py-2.5 text-sm text-gray-400 hover:text-brand-berry border border-gray-100 rounded-xl transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  )
}
