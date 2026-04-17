import { useEffect, useState } from 'react'
import { useSession } from '../../hooks/useSession'
import {
  createEntrega,
  createCobro,
  getPedidosPendientesEntrega,
  calcularTotal,
} from '../../services/pedidos'
import type { Pedido, EstatusEntrega, EntregaFormData, MetodoCobro } from '../../services/pedidos'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

function hoy() {
  return new Date().toLocaleDateString('sv') // YYYY-MM-DD local
}

interface DetalleItem {
  producto_id: number
  cantidad: number
  precio_unit: number
  nombre: string
  unidad: string
  photo_url: string | null
  cantidad_pedida: number
}

interface Props {
  pedidoInicial?: Pedido
  onClose: () => void
  onSaved: () => void
}

const METODOS: { value: MetodoCobro; label: string; icon: string }[] = [
  { value: 'efectivo',      label: 'Efectivo',      icon: '💵' },
  { value: 'transferencia', label: 'Transferencia',  icon: '🏦' },
  { value: 'tarjeta',       label: 'Tarjeta',        icon: '💳' },
]

const ESTATUS_OPTS: { value: EstatusEntrega; label: string; color: string }[] = [
  { value: 'completa', label: 'Completa', color: 'bg-green-100 text-green-700' },
  { value: 'parcial',  label: 'Parcial',  color: 'bg-amber-100 text-amber-700' },
  { value: 'fallida',  label: 'Fallida',  color: 'bg-red-100 text-red-500'     },
]

export default function EntregaModal({ pedidoInicial, onClose, onSaved }: Props) {
  const { session } = useSession()

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)

  // Entrega
  const [pedidoId, setPedidoId] = useState(pedidoInicial?.id ?? '')
  const [fechaEntrega, setFechaEntrega] = useState(hoy())
  const [entregadoPor, setEntregadoPor] = useState('')
  const [estatus, setEstatus] = useState<EstatusEntrega>('completa')
  const [notas, setNotas] = useState('')
  const [detalle, setDetalle] = useState<DetalleItem[]>([])

  // Cobro
  const [cobrar, setCobrar] = useState(false)
  const [metodoCobro, setMetodoCobro] = useState<MetodoCobro>('efectivo')
  const [montoCobro, setMontoCobro] = useState(0)
  const [referencia, setReferencia] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Cargar pedidos pendientes
  useEffect(() => {
    getPedidosPendientesEntrega().then(data => {
      if (pedidoInicial && !data.find(p => p.id === pedidoInicial.id)) {
        setPedidos([pedidoInicial, ...data])
      } else {
        setPedidos(data)
      }
      setLoadingPedidos(false)
    })
  }, [])

  // Pre-llenar detalle cuando cambia el pedido
  useEffect(() => {
    const p = pedidos.find(p => p.id === pedidoId) ?? pedidoInicial
    if (!p) { setDetalle([]); return }
    setDetalle(
      (p.detalle ?? []).map(d => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio_unit: d.precio_unit,
        nombre: d.producto?.name ?? `Producto #${d.producto_id}`,
        unidad: d.producto?.unit ?? 'pz',
        photo_url: d.producto?.photo_url ?? null,
        cantidad_pedida: d.cantidad,
      }))
    )
  }, [pedidoId, pedidos])

  // Sincronizar cantidades según resultado
  useEffect(() => {
    if (estatus === 'fallida') {
      setDetalle(prev => prev.map(d => ({ ...d, cantidad: 0 })))
    } else if (estatus === 'completa') {
      setDetalle(prev => prev.map(d => ({ ...d, cantidad: d.cantidad_pedida })))
    }
  }, [estatus])

  const total = detalle.reduce((s, d) => s + d.cantidad * d.precio_unit, 0)

  // Cuando cambia el total y el cobro está activo, sincronizar monto por defecto
  useEffect(() => {
    if (cobrar) setMontoCobro(total)
  }, [total, cobrar])

  const pedidoSel = pedidos.find(p => p.id === pedidoId) ?? pedidoInicial

  function setItemCantidad(idx: number, val: number) {
    setDetalle(prev => prev.map((d, i) => i === idx ? { ...d, cantidad: Math.max(0, val) } : d))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pedidoId) { setError('Selecciona un pedido'); return }
    if (detalle.length === 0) { setError('No hay productos en el pedido'); return }

    setSaving(true)
    setError('')

    // 1. Crear entrega
    const form: EntregaFormData = {
      pedido_id: pedidoId,
      fecha_entrega: fechaEntrega,
      entregado_por: entregadoPor,
      notas,
      estatus,
      detalle: detalle
        .filter(d => d.cantidad > 0)
        .map(d => ({ producto_id: d.producto_id, cantidad: d.cantidad, precio_unit: d.precio_unit })),
    }

    const { error: errEntrega } = await createEntrega(form, session!.user.id)
    if (errEntrega) {
      setSaving(false)
      setError('Error al guardar la entrega. Intenta de nuevo.')
      return
    }

    // 2. Si se cobra en el momento → crear cobro
    if (cobrar && montoCobro > 0 && pedidoSel) {
      const { error: errCobro } = await createCobro({
        cliente_id: pedidoSel.cliente_id,
        sucursal_id: pedidoSel.sucursal_id,
        pedido_id: pedidoId,
        monto: montoCobro,
        metodo: metodoCobro,
        referencia,
        notas: '',
        createdBy: session!.user.id,
      })
      if (errCobro) {
        setSaving(false)
        setError('Entrega guardada, pero hubo un error al registrar el cobro.')
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-black text-brand-coffee">Registrar entrega</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">

            {/* Pedido */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Pedido *</label>
              {loadingPedidos ? (
                <div className="input w-full animate-pulse bg-gray-100 h-10" />
              ) : pedidos.length === 0 ? (
                <div className="input w-full bg-gray-50 text-gray-400 text-sm py-2.5 px-3">
                  Sin pedidos confirmados pendientes
                </div>
              ) : (
                <select
                  value={pedidoId}
                  onChange={e => setPedidoId(e.target.value)}
                  required
                  className="input w-full"
                >
                  <option value="">— Seleccionar pedido —</option>
                  {pedidos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.cliente?.nombre_comercial ?? '—'}
                      {p.sucursal ? ` · ${p.sucursal.nombre_sucursal}` : ''}
                      {' · '}
                      {new Date(p.fecha_pedido + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      {' · '}{p.estatus}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Fecha + Entregado por */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha entrega *</label>
                <input type="date" value={fechaEntrega}
                  onChange={e => setFechaEntrega(e.target.value)}
                  required className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Entregado por</label>
                <input type="text" value={entregadoPor}
                  onChange={e => setEntregadoPor(e.target.value)}
                  placeholder="Nombre del repartidor"
                  className="input w-full" />
              </div>
            </div>

            {/* Resultado */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Resultado *</label>
              <div className="flex gap-2">
                {ESTATUS_OPTS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setEstatus(opt.value)}
                    className={`flex-1 text-xs font-bold py-2 rounded-xl border-2 transition-all ${
                      estatus === opt.value
                        ? opt.color + ' border-current'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Productos */}
            {detalle.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500">Productos entregados</label>
                  {pedidoSel && (
                    <span className="text-xs text-gray-400">
                      Pedido: {fmt(calcularTotal(pedidoSel.detalle ?? []))}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {detalle.map((d, idx) => (
                    <div key={d.producto_id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex-shrink-0 overflow-hidden">
                        {d.photo_url
                          ? <img src={d.photo_url} alt={d.nombre} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">🍦</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{d.nombre}</p>
                        <p className="text-xs text-gray-400">Pedido: {d.cantidad_pedida} {d.unidad}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <input
                          type="number" min="0" value={d.cantidad}
                          onChange={e => setItemCantidad(idx, Number(e.target.value))}
                          onClick={e => (e.target as HTMLInputElement).select()}
                          disabled={estatus === 'fallida'}
                          className="w-16 text-center text-xs font-bold border border-gray-200 rounded-lg py-1 bg-white focus:outline-none focus:border-brand-ocean disabled:opacity-40"
                        />
                        <span className="text-xs text-gray-400">{fmt(d.cantidad * d.precio_unit)}</span>
                      </div>
                    </div>
                  ))}
                  {total > 0 && (
                    <div className="flex justify-between items-center px-3 pt-1">
                      <span className="text-xs text-gray-400">Total entregado</span>
                      <span className="text-sm font-black text-brand-coffee">{fmt(total)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Notas</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                rows={2} placeholder="Observaciones de la entrega..."
                className="input w-full resize-none" />
            </div>

            {/* ── Cobro al entregar ─────────────────────────────── */}
            <div className={`rounded-2xl border-2 transition-colors ${cobrar ? 'border-green-300 bg-green-50/40' : 'border-gray-100 bg-gray-50/50'}`}>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => setCobrar(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">💵</span>
                  <span className="text-sm font-bold text-gray-700">¿Se cobró en esta entrega?</span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${cobrar ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${cobrar ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Detalle del cobro */}
              {cobrar && (
                <div className="px-4 pb-4 space-y-3 border-t border-green-200/60">
                  <p className="text-xs text-green-700 font-semibold pt-3">Se registrará un cobro automáticamente</p>

                  {/* Métodos */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Método de pago</label>
                    <div className="flex gap-2">
                      {METODOS.map(m => (
                        <button key={m.value} type="button" onClick={() => setMetodoCobro(m.value)}
                          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                            metodoCobro === m.value
                              ? 'border-green-400 bg-green-100 text-green-700'
                              : 'border-gray-200 text-gray-400 hover:border-gray-300'
                          }`}>
                          <span className="text-base">{m.icon}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Monto cobrado *</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={montoCobro}
                        onChange={e => setMontoCobro(Number(e.target.value))}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        className="input w-full font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Referencia {metodoCobro === 'transferencia' ? '*' : '(opcional)'}
                      </label>
                      <input
                        type="text"
                        value={referencia}
                        onChange={e => setReferencia(e.target.value)}
                        placeholder={metodoCobro === 'transferencia' ? 'Últimos 4 dígitos...' : '—'}
                        className="input w-full"
                      />
                    </div>
                  </div>

                  {/* Resumen */}
                  {total > 0 && montoCobro !== total && (
                    <div className={`text-xs font-semibold px-3 py-2 rounded-lg ${
                      montoCobro < total
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {montoCobro < total
                        ? `⚠️ Cobro parcial — queda ${fmt(total - montoCobro)} pendiente en CxC`
                        : `✓ Cobro mayor al total entregado (+${fmt(montoCobro - total)})`
                      }
                    </div>
                  )}
                  {total > 0 && montoCobro === total && (
                    <p className="text-xs font-semibold text-green-700 px-3 py-2 bg-green-50 rounded-lg">
                      ✓ Liquidado al 100%
                    </p>
                  )}
                </div>
              )}
            </div>

            {!cobrar && estatus !== 'fallida' && total > 0 && (
              <p className="text-xs text-gray-400 text-center -mt-2">
                Sin cobro → {fmt(total)} quedará como <span className="font-semibold text-amber-600">debe</span> en CxC
              </p>
            )}

            {error && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              type="submit"
              disabled={saving || !pedidoId}
              className="w-full bg-brand-berry text-white font-black py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="animate-pulse">Guardando...</span>
              ) : (
                <>
                  <span>{cobrar ? 'Registrar entrega + cobro' : 'Registrar entrega'}</span>
                  {total > 0 && <span className="opacity-80">· {fmt(total)}</span>}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
