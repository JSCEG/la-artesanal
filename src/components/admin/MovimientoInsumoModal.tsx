import { useEffect, useState } from 'react'
import type { Insumo, TipoMovimiento } from '../../services/insumos'
import { createMovimiento, getMovimientos } from '../../services/insumos'
import type { InsumoMovimiento } from '../../services/insumos'
import { supabase } from '../../services/supabase'

interface Props {
  insumo: Insumo
  onClose: () => void
  onSaved: () => void
}

const TIPOS: { value: TipoMovimiento; label: string; tone: string; hint: string }[] = [
  { value: 'entrada', label: 'Entrada',  tone: 'teal',  hint: 'Compra o recepción'   },
  { value: 'salida',  label: 'Salida',   tone: 'berry', hint: 'Uso en producción'    },
  { value: 'merma',   label: 'Merma',    tone: 'coral', hint: 'Caducidad, daño'      },
  { value: 'ajuste',  label: 'Ajuste',   tone: 'wood',  hint: 'Corrección de stock'  },
]

const ICON_CLOSE = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
)
const ICON_WARN = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
)

function tipoClasses(tone: string, active: boolean) {
  if (!active) return 'bg-white border-brand-wood/15 text-brand-wood hover:border-brand-wood/30'
  if (tone === 'teal')  return 'bg-brand-teal/10 border-brand-teal/40 text-brand-teal ring-2 ring-brand-teal/25'
  if (tone === 'berry') return 'bg-brand-berry/10 border-brand-berry/40 text-brand-berry ring-2 ring-brand-berry/25'
  if (tone === 'coral') return 'bg-brand-coral/15 border-brand-coral/40 text-brand-coral ring-2 ring-brand-coral/25'
  return 'bg-brand-wood/10 border-brand-wood/40 text-brand-wood ring-2 ring-brand-wood/25'
}

function fmtFecha(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function MovimientoInsumoModal({ insumo, onClose, onSaved }: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState<number>(0)
  const [signoAjuste, setSignoAjuste] = useState<'+' | '-'>('+')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState<InsumoMovimiento[]>([])

  useEffect(() => {
    getMovimientos(insumo.id).then(setHistorial).catch(() => {})
  }, [insumo.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cantidad <= 0) { setError('Cantidad debe ser mayor a 0'); return }
    setLoading(true); setError('')
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      if (!uid) { setError('Sesión no válida'); setLoading(false); return }
      const cantAbs = tipo === 'ajuste' ? (signoAjuste === '+' ? cantidad : -cantidad) : cantidad
      const { error } = await createMovimiento({
        insumo_id: insumo.id,
        tipo,
        cantidad_abs: cantAbs,
        motivo,
        createdBy: uid,
      })
      if (error) { setError(error.message); setLoading(false); return }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Error inesperado')
      setLoading(false)
    }
  }

  const preview = (() => {
    if (cantidad <= 0) return insumo.stock_actual
    const signed = tipo === 'entrada' ? cantidad
      : tipo === 'ajuste' ? (signoAjuste === '+' ? cantidad : -cantidad)
      : -cantidad
    return insumo.stock_actual + signed
  })()

  const previewLow = preview < 0
  const previewBelowMin = !previewLow && preview < insumo.stock_minimo

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Movimiento</h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">
              {insumo.nombre} · Stock actual <span className="font-black text-brand-wood">{insumo.stock_actual} {insumo.unidad}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors">
            {ICON_CLOSE}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Tipo chips */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Tipo de movimiento</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIPOS.map(t => {
                  const active = tipo === t.value
                  return (
                    <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                      className={`rounded-xl border-2 px-2 py-2 text-center transition-all ${tipoClasses(t.tone, active)}`}>
                      <p className="font-black text-[11px] uppercase tracking-widest">{t.label}</p>
                      <p className="text-[9px] opacity-70 mt-0.5">{t.hint}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Cantidad ({insumo.unidad})</label>
              <div className="flex items-center gap-2">
                {tipo === 'ajuste' && (
                  <div className="flex rounded-xl border-2 border-brand-wood/15 overflow-hidden flex-shrink-0">
                    {(['+', '-'] as const).map(s => (
                      <button key={s} type="button" onClick={() => setSignoAjuste(s)}
                        className={`w-10 h-11 font-display text-xl font-black transition-colors ${
                          signoAjuste === s
                            ? (s === '+' ? 'bg-brand-teal text-white' : 'bg-brand-berry text-white')
                            : 'bg-white text-brand-wood-soft hover:bg-brand-cream/40'
                        }`}>{s}</button>
                    ))}
                  </div>
                )}
                <input type="number" min="0" step="0.001" value={cantidad || ''}
                  onChange={e => setCantidad(Number(e.target.value))}
                  className="input flex-1 font-display text-xl font-black" placeholder="0" required />
              </div>
            </div>

            {/* Preview nuevo stock */}
            {cantidad > 0 && (
              <div className={`rounded-2xl p-4 border-2 ${
                previewLow
                  ? 'bg-brand-berry/10 border-brand-berry/30'
                  : previewBelowMin
                    ? 'bg-brand-coral/10 border-brand-coral/30'
                    : 'bg-brand-teal/5 border-brand-teal/25'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood/70">Nuevo stock</p>
                <p className={`font-display text-2xl font-black mt-1 ${
                  previewLow ? 'text-brand-berry' : previewBelowMin ? 'text-brand-coral' : 'text-brand-teal'
                }`}>
                  {preview} <span className="text-sm font-bold">{insumo.unidad}</span>
                </p>
                {previewLow && (
                  <p className="text-xs text-brand-berry font-bold mt-1">Queda negativo · revisa cantidad</p>
                )}
                {previewBelowMin && (
                  <p className="text-xs text-brand-coral font-bold mt-1">Bajo stock mínimo ({insumo.stock_minimo} {insumo.unidad})</p>
                )}
              </div>
            )}

            {/* Motivo */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Motivo / referencia</label>
              <input value={motivo} onChange={e => setMotivo(e.target.value)}
                className="input w-full" placeholder="Ej: Factura #A123, producción lote 42, caducidad…" />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-brand-berry/10 border-2 border-brand-berry/25 rounded-xl px-4 py-3">
                <span className="text-brand-berry mt-0.5">{ICON_WARN}</span>
                <p className="text-xs text-brand-berry font-bold flex-1">{error}</p>
              </div>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-2">Últimos movimientos</p>
                <div className="rounded-xl border border-brand-wood/10 divide-y divide-brand-wood/5 bg-brand-cream/20 max-h-48 overflow-y-auto">
                  {historial.map(m => {
                    const pos = m.cantidad > 0
                    return (
                      <div key={m.id} className="px-3 py-2 flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 ${
                          m.tipo === 'entrada' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' :
                          m.tipo === 'salida'  ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/30' :
                          m.tipo === 'merma'   ? 'bg-brand-coral/15 text-brand-coral border-brand-coral/30' :
                                                 'bg-brand-wood/10 text-brand-wood border-brand-wood/30'
                        }`}>{m.tipo}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-brand-wood truncate">{m.motivo ?? '—'}</p>
                          <p className="text-[10px] text-brand-wood-soft">{fmtFecha(m.created_at)}</p>
                        </div>
                        <p className={`font-display text-sm font-black flex-shrink-0 ${pos ? 'text-brand-teal' : 'text-brand-berry'}`}>
                          {pos ? '+' : ''}{m.cantidad}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-6 py-4 border-t border-brand-wood/10 bg-brand-cream/20 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-wood/15 text-brand-wood font-black text-[11px] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || cantidad <= 0}
              className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Registrando…
                </>
              ) : 'Registrar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
