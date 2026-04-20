import { useEffect, useState } from 'react'
import { getHistorialPedido, type PedidoHistorialEntry } from '../../services/pedidos'

interface Props {
  pedidoId: string
}

const ESTATUS_COLOR: Record<string, string> = {
  borrador:   'bg-brand-wood/10 text-brand-wood border-brand-wood/25',
  confirmado: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
  en_ruta:    'bg-brand-coral/15 text-brand-coral border-brand-coral/30',
  entregado:  'bg-brand-teal/15 text-brand-teal border-brand-teal/40',
  cancelado:  'bg-brand-berry/10 text-brand-berry border-brand-berry/30',
}

const ESTATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador', confirmado: 'Confirmado', en_ruta: 'En ruta',
  entregado: 'Entregado', cancelado: 'Cancelado',
}

function fmtRel(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const days = Math.floor(hr / 24)
  if (days < 7) return `hace ${days} d`
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
function fmtAbs(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function PedidoTimeline({ pedidoId }: Props) {
  const [rows, setRows] = useState<PedidoHistorialEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    getHistorialPedido(pedidoId)
      .then(r => { if (!cancel) setRows(r) })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [pedidoId])

  if (loading) return <p className="text-xs text-brand-wood-soft italic">Cargando historial...</p>
  if (rows.length === 0) return null

  return (
    <div className="border-t border-brand-wood/10 pt-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-3">Historial</p>
      <ol className="relative pl-4 space-y-3 border-l-2 border-brand-wood/15">
        {rows.map(r => (
          <li key={r.id} className="relative">
            <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white border-2 border-brand-teal" />
            <div className="flex items-center gap-2 flex-wrap">
              {r.estatus_from && (
                <>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[r.estatus_from] ?? ''}`}>
                    {ESTATUS_LABEL[r.estatus_from] ?? r.estatus_from}
                  </span>
                  <span className="text-brand-wood-soft text-xs">→</span>
                </>
              )}
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[r.estatus_to] ?? ''}`}>
                {ESTATUS_LABEL[r.estatus_to] ?? r.estatus_to}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-brand-wood-soft mt-0.5">
              <span title={fmtAbs(r.created_at)}>{fmtRel(r.created_at)}</span>
              {r.changed_by_name && <span>· {r.changed_by_name}</span>}
              {r.notas && <span className="italic">· {r.notas}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
