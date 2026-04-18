import { useEffect, useState } from 'react'
import { getInsumos, type Insumo } from '../../services/insumos'
import {
  getRecetaByProducto,
  upsertReceta,
  calcularCostoReceta,
  type Receta,
  type RecetaItemInput,
} from '../../services/recetas'

interface Props {
  productoId: number
  productoNombre: string
  onClose: () => void
  onSaved: () => void
}

interface Draft {
  insumo_id: string
  cantidad: number
}

const ICON_CLOSE = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
)
const ICON_TRASH = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
)
const ICON_PLUS = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
)

function fmtMXN(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
}

export default function RecetaModal({ productoId, productoNombre, onClose, onSaved }: Props) {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [receta, setReceta] = useState<Receta | null>(null)
  const [rendimiento, setRendimiento] = useState(1)
  const [notas, setNotas] = useState('')
  const [activo, setActivo] = useState(true)
  const [items, setItems] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancel = false
    async function load() {
      try {
        const [ins, rec] = await Promise.all([
          getInsumos(),
          getRecetaByProducto(productoId),
        ])
        if (cancel) return
        setInsumos(ins.filter(i => i.activo))
        setReceta(rec)
        if (rec) {
          setRendimiento(rec.rendimiento)
          setNotas(rec.notas ?? '')
          setActivo(rec.activo)
          setItems(rec.items.map(i => ({ insumo_id: i.insumo_id, cantidad: i.cantidad })))
        } else {
          setItems([])
        }
      } catch (e: any) {
        setError(e?.message ?? 'Error al cargar')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [productoId])

  const addRow = () => setItems(arr => [...arr, { insumo_id: insumos[0]?.id ?? '', cantidad: 1 }])
  const removeRow = (i: number) => setItems(arr => arr.filter((_, idx) => idx !== i))
  const updateRow = (i: number, patch: Partial<Draft>) =>
    setItems(arr => arr.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  // Costo en vivo
  const costoTotal = items.reduce((sum, it) => {
    const insumo = insumos.find(i => i.id === it.insumo_id)
    return sum + (insumo?.costo_unitario ?? 0) * it.cantidad
  }, 0)
  const costoUnitario = costoTotal / (rendimiento || 1)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (rendimiento <= 0) { setError('Rendimiento debe ser mayor a 0'); return }
    const validItems: RecetaItemInput[] = items.filter(
      i => i.insumo_id && i.cantidad > 0
    )
    if (validItems.length === 0) { setError('Agrega al menos un insumo'); return }

    // Validar duplicados
    const ids = validItems.map(i => i.insumo_id)
    if (new Set(ids).size !== ids.length) {
      setError('No repitas el mismo insumo. Suma las cantidades en una sola fila.')
      return
    }

    setSaving(true)
    setError('')
    const { error } = await upsertReceta(productoId, rendimiento, notas || null, activo, validItems)
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-teal">Receta / BOM</p>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood truncate">{productoNombre}</h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">
              {receta ? 'Actualiza la receta del producto' : 'Define los insumos que componen este producto'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors flex-shrink-0">
            {ICON_CLOSE}
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {loading ? (
              <div className="py-8 text-center text-brand-wood-soft text-sm">Cargando...</div>
            ) : (
              <>
                {/* Rendimiento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Rendimiento (unidades)</label>
                    <input type="number" min="0.001" step="0.001" value={rendimiento}
                      onChange={e => setRendimiento(Number(e.target.value))}
                      className="input w-full font-mono" />
                    <p className="text-[10px] text-brand-wood-soft font-medium mt-1">Cuántas unidades produce esta receta.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Estado</label>
                    <button type="button" onClick={() => setActivo(v => !v)}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-colors ${
                        activo
                          ? 'bg-brand-teal/10 border-brand-teal/30 text-brand-teal'
                          : 'bg-brand-wood/5 border-brand-wood/15 text-brand-wood-soft'
                      }`}>
                      {activo ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70">Insumos</label>
                    <button type="button" onClick={addRow}
                      disabled={insumos.length === 0}
                      className="text-[11px] font-black uppercase tracking-widest text-brand-teal hover:text-brand-berry flex items-center gap-1 disabled:opacity-40">
                      {ICON_PLUS} Agregar
                    </button>
                  </div>

                  {insumos.length === 0 ? (
                    <div className="rounded-xl p-4 bg-brand-coral/10 border-2 border-brand-coral/25 text-sm text-brand-coral font-bold">
                      No hay insumos activos. Ve a <span className="underline">Inventario</span> y da de alta insumos primero.
                    </div>
                  ) : items.length === 0 ? (
                    <div className="rounded-xl p-4 border-2 border-dashed border-brand-wood/20 text-center text-sm text-brand-wood-soft">
                      Sin insumos aún. Toca <b>Agregar</b> para empezar.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((it, i) => {
                        const insumo = insumos.find(x => x.id === it.insumo_id)
                        const subtotal = (insumo?.costo_unitario ?? 0) * it.cantidad
                        return (
                          <li key={i} className="grid grid-cols-[1fr_90px_70px_32px] gap-2 items-center">
                            <select value={it.insumo_id}
                              onChange={e => updateRow(i, { insumo_id: e.target.value })}
                              className="input text-sm">
                              {insumos.map(ins => (
                                <option key={ins.id} value={ins.id}>
                                  {ins.nombre} ({ins.unidad})
                                </option>
                              ))}
                            </select>
                            <input type="number" min="0" step="0.001" value={it.cantidad}
                              onChange={e => updateRow(i, { cantidad: Number(e.target.value) })}
                              className="input text-sm font-mono text-right"
                              placeholder="0" />
                            <span className="text-xs font-bold text-brand-wood-soft text-right truncate">
                              {fmtMXN(subtotal)}
                            </span>
                            <button type="button" onClick={() => removeRow(i)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-wood-soft hover:bg-brand-berry/10 hover:text-brand-berry transition-colors"
                              aria-label="Quitar">
                              {ICON_TRASH}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {/* Resumen costo */}
                {items.length > 0 && (
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-brand-teal/10 to-brand-teal/5 border-2 border-brand-teal/25 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-teal">Costo lote</p>
                      <p className="font-display text-lg font-black text-brand-wood">{fmtMXN(costoTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-teal">Rendimiento</p>
                      <p className="font-display text-lg font-black text-brand-wood">{rendimiento}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-teal">Costo / unidad</p>
                      <p className="font-display text-lg font-black text-brand-berry">{fmtMXN(costoUnitario)}</p>
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Notas</label>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)}
                    className="input w-full resize-none" rows={2} placeholder="Proceso, temperatura, tips..." />
                </div>

                {error && (
                  <div className="bg-brand-berry/10 border-2 border-brand-berry/25 rounded-xl px-4 py-3 text-xs font-bold text-brand-berry">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3 px-6 py-4 border-t border-brand-wood/10 bg-brand-cream/20 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-wood/15 text-brand-wood font-black text-[11px] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving || loading}
              className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Guardando…
                </>
              ) : receta ? 'Guardar cambios' : 'Crear receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
