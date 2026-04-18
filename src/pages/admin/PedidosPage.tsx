import { useEffect, useState, useMemo } from 'react'
import { getPedidos, updatePedidoEstatus, deletePedido, calcularTotal } from '../../services/pedidos'
import type { Pedido, EstatusPedido } from '../../services/pedidos'
import PedidoModal from '../../components/admin/PedidoModal'
import { CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import { useToast } from '../../context/ToastContext'

// ─── Configuración visual por estatus ────────────────────────────────────────

const ESTATUS_CFG: Record<EstatusPedido, { label: string; badge: string; next?: EstatusPedido; nextLabel?: string }> = {
  borrador:   { label: 'Borrador',   badge: 'bg-brand-wood/5 text-brand-wood-soft border-brand-wood/15',     next: 'confirmado', nextLabel: 'Confirmar' },
  confirmado: { label: 'Confirmado', badge: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30',         next: 'en_ruta',    nextLabel: 'En ruta'   },
  en_ruta:    { label: 'En ruta',    badge: 'bg-brand-coral/15 text-brand-coral border-brand-coral/30',      next: 'entregado',  nextLabel: 'Entregado' },
  entregado:  { label: 'Entregado',  badge: 'bg-brand-teal/15 text-brand-teal border-brand-teal/40'                                                     },
  cancelado:  { label: 'Cancelado',  badge: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'                                                  },
}

const TIPO_BADGE: Record<string, string> = {
  mayorista: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
  minorista: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30',
  evento:    'bg-brand-coral/15 text-brand-coral border-brand-coral/30',
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

function fmtFecha(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusPedido | 'todos'>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => { fetchPedidos() }, [])

  async function fetchPedidos() {
    setLoading(true)
    try {
      setPedidos(await getPedidos())
    } catch {
      toast.error('No se pudieron cargar los pedidos')
    } finally {
      setLoading(false)
    }
  }

  async function handleAvanzarEstatus(pedido: Pedido) {
    const cfg = ESTATUS_CFG[pedido.estatus]
    if (!cfg.next) return
    setUpdatingId(pedido.id)
    try {
      await updatePedidoEstatus(pedido.id, cfg.next)
      toast.success(`Pedido movido a ${cfg.nextLabel}`)
      await fetchPedidos()
    } catch (e: any) {
      console.error('[avanzar estatus]', e)
      toast.error(e?.message ?? 'No se pudo actualizar el estatus')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleCancelar(id: string) {
    try {
      await updatePedidoEstatus(id, 'cancelado')
      toast.info('Pedido cancelado')
      fetchPedidos()
    } catch {
      toast.error('No se pudo cancelar el pedido')
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await deletePedido(id)
      toast.success('Pedido eliminado')
      setConfirmDelete(null)
      fetchPedidos()
    } catch {
      toast.error('No se pudo eliminar el pedido')
    } finally {
      setDeleting(false)
    }
  }

  const filtrados = useMemo(() => pedidos.filter(p => {
    const q = busqueda.toLowerCase()
    const coincide = !q ||
      (p.cliente?.nombre_comercial ?? '').toLowerCase().includes(q) ||
      (p.sucursal?.nombre_sucursal ?? '').toLowerCase().includes(q)
    const estatusOk = filtroEstatus === 'todos' || p.estatus === filtroEstatus
    return coincide && estatusOk
  }), [pedidos, busqueda, filtroEstatus])

  const totalesPorEstatus = useMemo(() => {
    const t: Record<string, number> = {}
    for (const e of Object.keys(ESTATUS_CFG)) {
      t[e] = pedidos.filter(p => p.estatus === e).length
    }
    return t
  }, [pedidos])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Pedidos</h1>
          <p className="text-sm text-brand-wood-soft font-medium mt-1">{pedidos.length} pedidos registrados</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Nuevo pedido
        </button>
      </div>

      {/* Filtros de estatus */}
      <div className="flex items-center gap-2 flex-wrap">
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
        placeholder="Buscar por cliente o sucursal..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="input w-full"
      />

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          tone="coral"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>}
          title={filtroEstatus !== 'todos' || busqueda ? 'Sin resultados' : 'Aún no hay pedidos'}
          description={filtroEstatus !== 'todos' || busqueda
            ? 'Probá cambiar el filtro o el término de búsqueda.'
            : 'Creá tu primer pedido desde el botón de arriba.'}
          action={filtroEstatus !== 'todos' || busqueda ? (
            <button onClick={() => { setFiltroEstatus('todos'); setBusqueda('') }} className="btn-secondary text-sm">Limpiar filtros</button>
          ) : (
            <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">Crear primer pedido</button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtrados.map(pedido => {
            const cfg = ESTATUS_CFG[pedido.estatus]
            const total = calcularTotal(pedido.detalle ?? [])
            const nProductos = pedido.detalle?.length ?? 0
            const isUpdating = updatingId === pedido.id

            const isExpanded = expandedId === pedido.id

            return (
              <div key={pedido.id} className="bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] overflow-hidden">

                {/* ── Fila resumen (clickable para expandir) ── */}
                <div className="px-4 py-3 flex items-center gap-3">

                  {/* Chevron */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
                    aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-wood-soft hover:bg-brand-cream/60 hover:text-brand-berry transition-colors flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg"
                         className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>

                  {/* Info principal — clickable también */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-brand-wood truncate">
                        {pedido.cliente?.nombre_comercial ?? '—'}
                      </p>
                      {pedido.cliente?.tipo && (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 ${TIPO_BADGE[pedido.cliente.tipo] ?? ''}`}>
                          {pedido.cliente.tipo}
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-brand-wood-soft flex-wrap">
                      {pedido.sucursal && <span>· {pedido.sucursal.nombre_sucursal}</span>}
                      <span>{fmtFecha(pedido.fecha_pedido)}</span>
                      {pedido.fecha_entrega_programada && (
                        <span>→ {fmtFecha(pedido.fecha_entrega_programada)}</span>
                      )}
                      <span>{nProductos} {nProductos === 1 ? 'producto' : 'productos'}</span>
                      {total > 0 && (
                        <span className="text-brand-wood font-black">{fmt(total)}</span>
                      )}
                    </div>
                  </button>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cfg.next && (
                      <button
                        onClick={() => handleAvanzarEstatus(pedido)}
                        disabled={isUpdating}
                        className="text-[10px] bg-gradient-to-br from-brand-teal to-brand-teal-soft text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-90 disabled:opacity-50 whitespace-nowrap hidden sm:block shadow-[2px_2px_0_rgba(45,102,128,0.25)]"
                      >
                        {isUpdating ? '...' : `→ ${cfg.nextLabel}`}
                      </button>
                    )}
                    {pedido.estatus !== 'cancelado' && pedido.estatus !== 'entregado' && (
                      <button
                        onClick={() => handleCancelar(pedido.id)}
                        className="text-xs text-brand-wood-soft hover:text-brand-berry font-bold hidden sm:block"
                      >
                        Cancelar
                      </button>
                    )}
                    {confirmDelete === pedido.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(pedido.id)}
                          disabled={deleting}
                          className="text-[10px] bg-brand-berry text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                          {deleting ? '...' : 'Sí'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-[10px] text-brand-wood-soft font-black uppercase tracking-widest hover:text-brand-wood"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(pedido.id)}
                        aria-label="Eliminar pedido"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-wood/30 hover:text-brand-berry hover:bg-brand-berry/5 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Detalle expandido ── */}
                {isExpanded && (
                  <div className="border-t border-brand-wood/5 bg-brand-cream/20 px-4 py-3 space-y-3">

                    {/* Líneas de producto */}
                    {(pedido.detalle?.length ?? 0) === 0 ? (
                      <p className="text-xs text-brand-wood-soft italic">Sin productos registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {pedido.detalle!.map(d => {
                          const subtotal = d.cantidad * d.precio_unit
                          return (
                            <div key={d.id} className="flex items-center gap-3">
                              {/* Miniatura */}
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
                              {/* Nombre + unidad */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-brand-wood truncate">
                                  {d.producto?.name ?? `Producto #${d.producto_id}`}
                                </p>
                                <p className="text-xs text-brand-wood-soft">
                                  {d.cantidad} {d.producto?.unit ?? 'pz'} × {fmt(d.precio_unit)}
                                </p>
                              </div>
                              {/* Subtotal */}
                              <p className="text-sm font-black text-brand-wood flex-shrink-0">
                                {fmt(subtotal)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Total */}
                    {total > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-brand-wood/15">
                        <span className="text-[10px] font-black text-brand-wood-soft uppercase tracking-widest">Total</span>
                        <span className="font-display text-lg font-black text-brand-berry">{fmt(total)}</span>
                      </div>
                    )}

                    {/* Notas */}
                    {pedido.notas && (
                      <p className="text-xs text-brand-wood-soft italic border-t border-brand-wood/10 pt-2 flex items-start gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                        {pedido.notas}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo pedido */}
      {modalOpen && (
        <PedidoModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); toast.success('Pedido creado'); fetchPedidos() }}
        />
      )}
    </div>
  )
}
