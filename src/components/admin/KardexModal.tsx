import { useEffect, useState } from 'react'
import { getKardex, type KardexRow, type Insumo } from '../../services/insumos'

interface Props {
  insumo: Insumo
  onClose: () => void
}

const ICON_CLOSE = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
)

function fmtMXN(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
}
function fmtFecha(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function tipoBadge(tipo: string) {
  const map: Record<string, string> = {
    entrada: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
    salida:  'bg-brand-berry/10 text-brand-berry border-brand-berry/30',
    merma:   'bg-brand-coral/15 text-brand-coral border-brand-coral/30',
    ajuste:  'bg-brand-wood/10 text-brand-wood border-brand-wood/30',
  }
  return map[tipo] ?? map.ajuste
}

export default function KardexModal({ insumo, onClose }: Props) {
  const [rows, setRows] = useState<KardexRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getKardex(insumo.id)
      .then(setRows)
      .catch(e => setError(e?.message ?? 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [insumo.id])

  const valorInventario = insumo.stock_actual * insumo.costo_unitario

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-teal">Kardex · Costo promedio móvil</p>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood truncate">{insumo.nombre}</h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">
              Stock <b className="text-brand-wood">{insumo.stock_actual} {insumo.unidad}</b> · Costo actual <b className="text-brand-wood">{fmtMXN(insumo.costo_unitario)}</b> · Valor inventario <b className="text-brand-teal">{fmtMXN(valorInventario)}</b>
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors flex-shrink-0">
            {ICON_CLOSE}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <div className="py-8 text-center text-brand-wood-soft text-sm">Cargando kardex...</div>
          ) : error ? (
            <div className="bg-brand-berry/10 border-2 border-brand-berry/25 rounded-xl px-4 py-3 text-sm font-bold text-brand-berry">{error}</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-brand-wood-soft text-sm">Sin movimientos registrados.</div>
          ) : (
            <div className="rounded-2xl border border-brand-wood/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-wood/10 bg-brand-cream/40">
                    <th className="text-left px-3 py-2.5 font-black text-brand-wood text-[10px] uppercase tracking-widest">Fecha</th>
                    <th className="text-left px-3 py-2.5 font-black text-brand-wood text-[10px] uppercase tracking-widest">Tipo</th>
                    <th className="text-left px-3 py-2.5 font-black text-brand-wood text-[10px] uppercase tracking-widest">Motivo</th>
                    <th className="text-right px-3 py-2.5 font-black text-brand-wood text-[10px] uppercase tracking-widest">Cantidad</th>
                    <th className="text-right px-3 py-2.5 font-black text-brand-wood text-[10px] uppercase tracking-widest">Costo mov.</th>
                    <th className="text-right px-3 py-2.5 font-black text-brand-wood text-[10px] uppercase tracking-widest">Stock</th>
                    <th className="text-right px-3 py-2.5 font-black text-brand-wood text-[10px] uppercase tracking-widest">WAC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-wood/5">
                  {rows.map(r => {
                    const pos = r.cantidad > 0
                    return (
                      <tr key={r.id} className="hover:bg-brand-cream/20">
                        <td className="px-3 py-2 text-xs text-brand-wood-soft whitespace-nowrap">{fmtFecha(r.created_at)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${tipoBadge(r.tipo)}`}>
                            {r.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-brand-wood truncate max-w-[180px]">{r.motivo ?? '—'}</td>
                        <td className={`px-3 py-2 text-right font-mono text-sm font-black ${pos ? 'text-brand-teal' : 'text-brand-berry'}`}>
                          {pos ? '+' : ''}{r.cantidad}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-brand-wood-soft">
                          {r.costo_unitario != null ? fmtMXN(r.costo_unitario) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-bold text-brand-wood">{r.stock_running}</td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-bold text-brand-teal">{fmtMXN(r.wac_running)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-brand-wood/10 bg-brand-cream/20 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-wood/15 text-brand-wood font-black text-[11px] uppercase tracking-widest hover:bg-white transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
