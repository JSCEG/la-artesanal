import { useEffect, useState, useMemo } from 'react'
import { getEntregas, getPedidosPendientesEntrega, calcularTotal } from '../../services/pedidos'
import type { Entrega, Pedido, EstatusEntrega } from '../../services/pedidos'
import EntregaModal from '../../components/admin/EntregaModal'
import { toCSV, downloadCSV, fechaStamp } from '../../utils/csv'
import { CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import { useToast } from '../../context/ToastContext'

const ESTATUS_CFG: Record<EstatusEntrega, { label: string; badge: string }> = {
  pendiente: { label: 'Pendiente', badge: 'bg-brand-wood/5 text-brand-wood-soft border-brand-wood/15'   },
  completa:  { label: 'Completa',  badge: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'       },
  parcial:   { label: 'Parcial',   badge: 'bg-brand-coral/15 text-brand-coral border-brand-coral/30'    },
  fallida:   { label: 'Fallida',   badge: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'    },
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

function fmtFecha(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function EntregasPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [pendientes, setPendientes] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusEntrega | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pedidoModal, setPedidoModal] = useState<Pedido | undefined>(undefined)
  const toast = useToast()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [e, p] = await Promise.all([getEntregas(), getPedidosPendientesEntrega()])
      setEntregas(e)
      setPendientes(p)
    } catch {
      toast.error('No se pudieron cargar las entregas')
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(pedido?: Pedido) {
    setPedidoModal(pedido)
    setModalOpen(true)
  }

  const filtradas = useMemo(() => entregas.filter(e => {
    const q = busqueda.toLowerCase()
    const nombre = (e.pedido?.cliente?.nombre_comercial ?? '').toLowerCase()
    const suc = (e.pedido?.sucursal?.nombre_sucursal ?? '').toLowerCase()
    const coincide = !q || nombre.includes(q) || suc.includes(q) || (e.entregado_por ?? '').toLowerCase().includes(q)
    const estatusOk = filtroEstatus === 'todos' || e.estatus === filtroEstatus
    return coincide && estatusOk
  }), [entregas, busqueda, filtroEstatus])

  const totalesPorEstatus = useMemo(() => {
    const t: Record<string, number> = {}
    for (const k of Object.keys(ESTATUS_CFG)) {
      t[k] = entregas.filter(e => e.estatus === k).length
    }
    return t
  }, [entregas])

  const hayFiltro = busqueda.trim() !== '' || filtroEstatus !== 'todos'

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Entregas</h1>
          <p className="text-sm text-brand-wood-soft font-medium mt-1">{entregas.length} entregas registradas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const rows = filtradas.map(e => {
                const total = calcularTotal(e.detalle ?? [])
                const nItems = (e.detalle ?? []).reduce((s, d) => s + d.cantidad, 0)
                return [
                  e.id.slice(0, 8), e.estatus, e.fecha_entrega,
                  e.pedido?.cliente?.nombre_comercial ?? '',
                  e.pedido?.sucursal?.nombre_sucursal ?? '',
                  e.entregado_por ?? '', nItems, total,
                  (e.notas ?? '').replace(/\n/g, ' '),
                ]
              })
              const csv = toCSV(
                ['ID', 'Estatus', 'Fecha', 'Cliente', 'Sucursal', 'Entregado por', 'Unidades', 'Total', 'Notas'],
                rows,
              )
              downloadCSV(`entregas-${fechaStamp()}.csv`, csv)
            }}
            className="text-xs font-black uppercase tracking-widest text-brand-wood-soft hover:text-brand-teal px-3 py-2 rounded-xl border-2 border-brand-wood/15 hover:border-brand-teal/40 flex items-center gap-1.5 bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            CSV
          </button>
          <button
            onClick={() => abrirModal()}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Nueva entrega
          </button>
        </div>
      </div>

      {/* Pedidos pendientes de entregar */}
      {!loading && pendientes.length > 0 && (
        <div className="relative bg-gradient-to-br from-brand-coral/15 to-brand-berry-soft/10 border-2 border-brand-coral/30 rounded-2xl p-4 space-y-3 overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
               style={{
                 backgroundImage: 'radial-gradient(circle, rgba(235,121,111,0.4) 1px, transparent 1px)',
                 backgroundSize: '18px 18px',
               }} />
          <p className="relative text-[10px] font-black text-brand-coral uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-coral inline-block animate-pulse" />
            {pendientes.length} {pendientes.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'} de entrega
          </p>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {pendientes.map(pedido => {
              const total = calcularTotal(pedido.detalle ?? [])
              const nProd = pedido.detalle?.length ?? 0
              return (
                <div key={pedido.id} className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-brand-wood text-sm truncate">
                      {pedido.cliente?.nombre_comercial ?? '—'}
                    </p>
                    <div className="text-xs text-brand-wood-soft mt-0.5 flex items-center gap-2 flex-wrap">
                      {pedido.sucursal && <span>· {pedido.sucursal.nombre_sucursal}</span>}
                      {pedido.fecha_entrega_programada && (
                        <span>{fmtFecha(pedido.fecha_entrega_programada)}</span>
                      )}
                      <span>{nProd} prod · {total > 0 ? fmt(total) : '—'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirModal(pedido)}
                    className="text-[10px] bg-gradient-to-br from-brand-teal to-brand-teal-soft text-white font-black uppercase tracking-widest px-3 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap flex-shrink-0 shadow-[2px_2px_0_rgba(45,102,128,0.25)]"
                  >
                    Registrar →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros estatus */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFiltroEstatus('todos')}
          className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${
            filtroEstatus === 'todos'
              ? 'bg-brand-wood text-white border-brand-wood shadow-[2px_2px_0_rgba(91,56,34,0.25)]'
              : 'bg-white text-brand-wood border-brand-wood/15 hover:border-brand-wood/40'
          }`}
        >
          Todas ({entregas.length})
        </button>
        {(Object.entries(ESTATUS_CFG) as [EstatusEntrega, typeof ESTATUS_CFG[EstatusEntrega]][])
          .filter(([k]) => k !== 'pendiente')
          .map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFiltroEstatus(filtroEstatus === key ? 'todos' : key)}
              className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${cfg.badge} ${
                filtroEstatus === key ? 'ring-2 ring-offset-1 ring-current' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {cfg.label} {totalesPorEstatus[key] > 0 && `(${totalesPorEstatus[key]})`}
            </button>
          ))}
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por cliente, sucursal o repartidor..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="input w-full"
      />

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          tone="teal"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="15" height="13" x="1" y="3" rx="2"/><path d="M16 8h4l3 5v5a2 2 0 0 1-2 2h-1"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
          title={hayFiltro ? 'Sin resultados' : 'Aún no hay entregas'}
          description={hayFiltro
            ? 'Probá cambiar el filtro o el término de búsqueda.'
            : 'Registrá la primera entrega desde el botón de arriba o desde un pedido pendiente.'}
          action={hayFiltro ? (
            <button onClick={() => { setFiltroEstatus('todos'); setBusqueda('') }} className="btn-secondary text-sm">Limpiar filtros</button>
          ) : (
            <button onClick={() => abrirModal()} className="btn-primary text-sm">Registrar entrega</button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtradas.map(entrega => {
            const cfg = ESTATUS_CFG[entrega.estatus]
            const total = (entrega.detalle ?? []).reduce((s, d) => s + d.cantidad * d.precio_unit, 0)
            const nProd = entrega.detalle?.length ?? 0
            const isExpanded = expandedId === entrega.id

            return (
              <div key={entrega.id} className="bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] overflow-hidden">

                {/* Fila resumen */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entrega.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-brand-cream/30 transition-colors"
                >
                  {/* Chevron */}
                  <span className="text-brand-wood-soft flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg"
                         className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-brand-wood truncate">
                        {entrega.pedido?.cliente?.nombre_comercial ?? '—'}
                      </p>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-brand-wood-soft flex-wrap">
                      {entrega.pedido?.sucursal && (
                        <span>· {entrega.pedido.sucursal.nombre_sucursal}</span>
                      )}
                      <span>{fmtFecha(entrega.fecha_entrega)}</span>
                      {entrega.entregado_por && <span>· {entrega.entregado_por}</span>}
                      <span>{nProd} {nProd === 1 ? 'producto' : 'productos'}</span>
                      {total > 0 && (
                        <span className="text-brand-wood font-black">{fmt(total)}</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="border-t border-brand-wood/5 bg-brand-cream/20 px-4 py-3 space-y-3">
                    {(entrega.detalle?.length ?? 0) === 0 ? (
                      <p className="text-xs text-brand-wood-soft italic">Sin detalle de productos</p>
                    ) : (
                      <div className="space-y-2">
                        {entrega.detalle!.map(d => {
                          const subtotal = d.cantidad * d.precio_unit
                          return (
                            <div key={d.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white border border-brand-wood/10 flex-shrink-0 overflow-hidden">
                                {d.producto?.photo_url ? (
                                  <img src={d.producto.photo_url} alt={d.producto.name}
                                    className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-brand-wood-soft">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-brand-wood truncate">
                                  {d.producto?.name ?? `Producto #${d.producto_id}`}
                                </p>
                                <p className="text-xs text-brand-wood-soft">
                                  {d.cantidad} {d.producto?.unit ?? 'pz'} × {fmt(d.precio_unit)}
                                </p>
                              </div>
                              <p className="text-sm font-black text-brand-wood flex-shrink-0">{fmt(subtotal)}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {total > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-brand-wood/15">
                        <span className="text-[10px] font-black text-brand-wood-soft uppercase tracking-widest">Total entregado</span>
                        <span className="font-display text-lg font-black text-brand-berry">{fmt(total)}</span>
                      </div>
                    )}
                    {entrega.notas && (
                      <p className="text-xs text-brand-wood-soft italic border-t border-brand-wood/10 pt-2 flex items-start gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                        {entrega.notas}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <EntregaModal
          pedidoInicial={pedidoModal}
          onClose={() => { setModalOpen(false); setPedidoModal(undefined) }}
          onSaved={() => { setModalOpen(false); setPedidoModal(undefined); toast.success('Entrega registrada'); fetchAll() }}
        />
      )}
    </div>
  )
}
