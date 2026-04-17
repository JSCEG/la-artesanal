import { useEffect, useMemo, useState } from 'react'
import { getInsumos, deleteInsumo } from '../../services/insumos'
import type { Insumo } from '../../services/insumos'
import InsumoModal from '../../components/admin/InsumoModal'
import MovimientoInsumoModal from '../../components/admin/MovimientoInsumoModal'
import { CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import { useToast } from '../../context/ToastContext'

const ICON_BOX = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
)
const ICON_TRASH = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
)
const ICON_ALERT = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
)

const fmtMoney = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

type EstadoStock = 'ok' | 'bajo' | 'agotado'
function estadoStock(i: Insumo): EstadoStock {
  if (i.stock_actual <= 0) return 'agotado'
  if (i.stock_actual < i.stock_minimo) return 'bajo'
  return 'ok'
}

export default function InventarioPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'bajo' | 'agotado'>('todos')
  const [insumoModal, setInsumoModal] = useState<{ open: boolean; insumo?: Insumo | null }>({ open: false })
  const [movModal, setMovModal] = useState<{ open: boolean; insumo?: Insumo }>({ open: false })
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  useEffect(() => { fetchInsumos() }, [])

  async function fetchInsumos() {
    setLoading(true)
    try { setInsumos(await getInsumos()) }
    catch { toast.error('No se pudieron cargar los insumos') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await deleteInsumo(id)
      toast.success('Insumo eliminado')
      setConfirmDel(null)
      fetchInsumos()
    } catch { toast.error('No se pudo eliminar') }
    finally { setDeleting(false) }
  }

  const metricas = useMemo(() => {
    const bajos = insumos.filter(i => estadoStock(i) === 'bajo').length
    const agotados = insumos.filter(i => estadoStock(i) === 'agotado').length
    const valor = insumos.reduce((s, i) => s + i.stock_actual * i.costo_unitario, 0)
    return { total: insumos.length, bajos, agotados, valor }
  }, [insumos])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return insumos.filter(i => {
      const coincide = !q
        || i.nombre.toLowerCase().includes(q)
        || (i.proveedor ?? '').toLowerCase().includes(q)
      if (!coincide) return false
      if (filtro === 'bajo')    return estadoStock(i) === 'bajo'
      if (filtro === 'agotado') return estadoStock(i) === 'agotado'
      return true
    })
  }, [insumos, busqueda, filtro])

  const hayFiltro = busqueda.trim() !== '' || filtro !== 'todos'

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Inventario</h1>
          <p className="text-sm text-brand-wood-soft font-medium mt-1">
            {metricas.total} {metricas.total === 1 ? 'insumo' : 'insumos'} registrados
          </p>
        </div>
        <button onClick={() => setInsumoModal({ open: true, insumo: null })} className="btn-primary text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Nuevo insumo
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-brand-wood/10 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Valor inventario</p>
          <p className="font-display text-2xl font-black text-brand-wood mt-1">{fmtMoney(metricas.valor)}</p>
          <p className="text-xs text-brand-wood-soft mt-0.5">Stock × costo</p>
        </div>
        <div className="bg-brand-teal/5 border-2 border-brand-teal/25 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-teal">OK</p>
          <p className="font-display text-2xl font-black text-brand-teal mt-1">{metricas.total - metricas.bajos - metricas.agotados}</p>
          <p className="text-xs text-brand-wood-soft mt-0.5">En niveles normales</p>
        </div>
        <div className={`rounded-2xl px-4 py-3 border-2 ${metricas.bajos > 0 ? 'bg-brand-coral/10 border-brand-coral/30' : 'bg-white border-brand-wood/10'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${metricas.bajos > 0 ? 'text-brand-coral' : 'text-brand-wood-soft'}`}>Bajo mínimo</p>
          <p className={`font-display text-2xl font-black mt-1 ${metricas.bajos > 0 ? 'text-brand-coral' : 'text-brand-wood'}`}>{metricas.bajos}</p>
          <p className="text-xs text-brand-wood-soft mt-0.5">Reponer pronto</p>
        </div>
        <div className={`rounded-2xl px-4 py-3 border-2 ${metricas.agotados > 0 ? 'bg-brand-berry/10 border-brand-berry/30' : 'bg-white border-brand-wood/10'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${metricas.agotados > 0 ? 'text-brand-berry' : 'text-brand-wood-soft'}`}>Agotados</p>
          <p className={`font-display text-2xl font-black mt-1 ${metricas.agotados > 0 ? 'text-brand-berry' : 'text-brand-wood'}`}>{metricas.agotados}</p>
          <p className="text-xs text-brand-wood-soft mt-0.5">Stock ≤ 0</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['todos', 'bajo', 'agotado'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${
              filtro === f
                ? 'bg-brand-wood text-white border-brand-wood shadow-[2px_2px_0_rgba(91,56,34,0.25)]'
                : 'bg-white text-brand-wood border-brand-wood/15 hover:border-brand-wood/40'
            }`}>
            {f === 'todos' ? 'Todos' : f === 'bajo' ? `Bajo mínimo (${metricas.bajos})` : `Agotados (${metricas.agotados})`}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <input type="text" placeholder="Buscar insumo o proveedor…"
        value={busqueda} onChange={e => setBusqueda(e.target.value)}
        className="input w-full" />

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          tone="wood"
          icon={ICON_BOX}
          title={hayFiltro ? 'Sin resultados' : 'Aún no hay insumos'}
          description={hayFiltro
            ? 'Probá con otro término o limpia los filtros.'
            : 'Registra tu primer insumo para empezar a controlar el inventario.'}
          action={hayFiltro ? (
            <button onClick={() => { setBusqueda(''); setFiltro('todos') }} className="btn-secondary text-sm">Limpiar</button>
          ) : (
            <button onClick={() => setInsumoModal({ open: true, insumo: null })} className="btn-primary text-sm">Crear primer insumo</button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtrados.map(i => {
            const estado = estadoStock(i)
            return (
              <div key={i.id} className={`bg-white rounded-2xl border shadow-[0_4px_20px_rgba(177,48,107,0.04)] px-4 py-3 flex items-center gap-3 ${
                estado === 'agotado' ? 'border-brand-berry/30' : estado === 'bajo' ? 'border-brand-coral/30' : 'border-brand-wood/10'
              }`}>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                  estado === 'agotado' ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/30' :
                  estado === 'bajo'    ? 'bg-brand-coral/15 text-brand-coral border-brand-coral/30' :
                                         'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/></svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-brand-wood truncate">{i.nombre}</p>
                    {!i.activo && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-brand-wood/5 text-brand-wood-soft border border-brand-wood/15 px-2 py-0.5 rounded-full">inactivo</span>
                    )}
                    {estado === 'bajo' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-brand-coral/15 text-brand-coral border border-brand-coral/30 px-2 py-0.5 rounded-full">
                        {ICON_ALERT} Bajo mínimo
                      </span>
                    )}
                    {estado === 'agotado' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-brand-berry/10 text-brand-berry border border-brand-berry/30 px-2 py-0.5 rounded-full">
                        {ICON_ALERT} Agotado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-brand-wood-soft flex-wrap">
                    <span>
                      <span className="font-black text-brand-wood">{i.stock_actual}</span> {i.unidad}
                      <span className="text-brand-wood/40"> · mín {i.stock_minimo}</span>
                    </span>
                    {i.costo_unitario > 0 && <span>· {fmtMoney(i.costo_unitario)}/{i.unidad}</span>}
                    {i.proveedor && <span>· {i.proveedor}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setMovModal({ open: true, insumo: i })}
                    className="text-xs text-brand-teal font-black uppercase tracking-wide hover:opacity-70">
                    Movimiento
                  </button>
                  <button onClick={() => setInsumoModal({ open: true, insumo: i })}
                    className="text-xs text-brand-berry font-black uppercase tracking-wide hover:opacity-70">
                    Editar
                  </button>
                  {confirmDel === i.id ? (
                    <span className="flex items-center gap-1">
                      <button onClick={() => handleDelete(i.id)} disabled={deleting}
                        className="text-[10px] bg-brand-berry text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-90 disabled:opacity-50">
                        {deleting ? '...' : 'Sí'}
                      </button>
                      <button onClick={() => setConfirmDel(null)}
                        className="text-[10px] text-brand-wood-soft font-black uppercase tracking-widest hover:text-brand-wood">No</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDel(i.id)} aria-label="Eliminar"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-wood/30 hover:text-brand-berry hover:bg-brand-berry/5 transition-colors">
                      {ICON_TRASH}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modales */}
      {insumoModal.open && (
        <InsumoModal
          insumo={insumoModal.insumo}
          onClose={() => setInsumoModal({ open: false })}
          onSaved={() => { setInsumoModal({ open: false }); toast.success('Insumo guardado'); fetchInsumos() }}
        />
      )}
      {movModal.open && movModal.insumo && (
        <MovimientoInsumoModal
          insumo={movModal.insumo}
          onClose={() => setMovModal({ open: false })}
          onSaved={() => { setMovModal({ open: false }); toast.success('Movimiento registrado'); fetchInsumos() }}
        />
      )}
    </div>
  )
}
