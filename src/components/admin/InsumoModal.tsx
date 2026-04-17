import { useEffect, useState } from 'react'
import type { Insumo, InsumoFormData } from '../../services/insumos'
import { upsertInsumo } from '../../services/insumos'

interface Props {
  insumo?: Insumo | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY: InsumoFormData = {
  nombre: '', unidad: 'kg', stock_minimo: 0, costo_unitario: 0,
  proveedor: '', notas: '', activo: true,
}

const UNIDADES = [
  { value: 'kg',   label: 'kg'   },
  { value: 'g',    label: 'g'    },
  { value: 'l',    label: 'l'    },
  { value: 'ml',   label: 'ml'   },
  { value: 'pz',   label: 'pz'   },
  { value: 'caja', label: 'caja' },
]

const ICON_CLOSE = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
)
const ICON_WARN = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
)

export default function InsumoModal({ insumo, onClose, onSaved }: Props) {
  const [form, setForm] = useState<InsumoFormData>(EMPTY)
  const [stockInicial, setStockInicial] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isNew = !insumo

  useEffect(() => {
    setForm(insumo ? {
      nombre: insumo.nombre,
      unidad: insumo.unidad,
      stock_minimo: insumo.stock_minimo,
      costo_unitario: insumo.costo_unitario,
      proveedor: insumo.proveedor ?? '',
      notas: insumo.notas ?? '',
      activo: insumo.activo,
    } : EMPTY)
    setStockInicial(0)
    setError('')
  }, [insumo])

  const set = (f: keyof InsumoFormData, v: any) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setLoading(true); setError('')
    try {
      const { error } = await upsertInsumo(form, insumo?.id, isNew ? stockInicial : undefined)
      if (error) { setError(error.message); setLoading(false); return }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Error inesperado')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">
              {insumo ? 'Editar insumo' : 'Nuevo insumo'}
            </h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">
              {insumo ? 'Actualiza datos del insumo' : 'Registra materia prima o empaque'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors">
            {ICON_CLOSE}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="input w-full" placeholder="Ej: Fresa congelada" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Unidad</label>
                <select value={form.unidad} onChange={e => set('unidad', e.target.value)} className="input w-full">
                  {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Stock mínimo</label>
                <input type="number" min="0" step="0.001" value={form.stock_minimo}
                  onChange={e => set('stock_minimo', Number(e.target.value))}
                  className="input w-full font-mono" placeholder="0" />
              </div>
            </div>

            {isNew && (
              <div className="rounded-2xl p-4 bg-gradient-to-br from-brand-teal/10 to-brand-teal/5 border-2 border-brand-teal/25">
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-teal mb-1.5">
                  Stock inicial ({form.unidad})
                </label>
                <input type="number" min="0" step="0.001" value={stockInicial || ''}
                  onChange={e => setStockInicial(Number(e.target.value))}
                  className="input w-full font-display text-xl font-black" placeholder="0" />
                <p className="text-[10px] text-brand-wood-soft font-medium mt-1.5">
                  Genera un movimiento de entrada automático al guardar. Déjalo en 0 si aún no hay existencias.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Costo unitario (MXN)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-black text-brand-wood-soft pointer-events-none select-none">$</span>
                <input type="number" min="0" step="0.01" value={form.costo_unitario}
                  onChange={e => set('costo_unitario', Number(e.target.value))}
                  className="input w-full !pl-10 font-display text-lg font-black" placeholder="0.00" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Proveedor</label>
              <input value={form.proveedor} onChange={e => set('proveedor', e.target.value)}
                className="input w-full" placeholder="Opcional" />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Notas</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                className="input w-full resize-none" rows={2} placeholder="Observaciones" />
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('activo', !form.activo)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${form.activo ? 'bg-brand-teal' : 'bg-brand-wood/15'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.activo ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-bold text-brand-wood">{form.activo ? 'Insumo activo' : 'Insumo inactivo'}</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-brand-berry/10 border-2 border-brand-berry/25 rounded-xl px-4 py-3">
                <span className="text-brand-berry mt-0.5">{ICON_WARN}</span>
                <p className="text-xs text-brand-berry font-bold flex-1">{error}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-6 py-4 border-t border-brand-wood/10 bg-brand-cream/20 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-wood/15 text-brand-wood font-black text-[11px] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Guardando…
                </>
              ) : insumo ? 'Guardar cambios' : 'Crear insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
