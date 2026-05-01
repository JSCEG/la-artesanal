import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from '../../hooks/useSession'
import {
  createEntrega,
  createCobro,
  getPedidosPendientesEntrega,
  calcularTotal,
  uploadEntregaFoto,
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

// ─── Iconos SVG inline ───────────────────────────────────────────────────────

const ICONS: Record<string, ReactNode> = {
  efectivo: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
  ),
  transferencia: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3 21 7l-4 4"/><path d="M21 7H9"/><path d="M7 21 3 17l4-4"/><path d="M3 17h12"/></svg>
  ),
  tarjeta: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
  ),
  check: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  warn: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  ),
}

const METODOS: { value: MetodoCobro; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta',       label: 'Tarjeta' },
]

const ESTATUS_OPTS: { value: EstatusEntrega; label: string; activeBg: string; activeBorder: string; activeText: string }[] = [
  { value: 'completa', label: 'Completa', activeBg: 'bg-brand-teal/15',  activeBorder: 'border-brand-teal',  activeText: 'text-brand-teal'  },
  { value: 'parcial',  label: 'Parcial',  activeBg: 'bg-brand-coral/15', activeBorder: 'border-brand-coral', activeText: 'text-brand-coral' },
  { value: 'fallida',  label: 'Fallida',  activeBg: 'bg-brand-berry/10', activeBorder: 'border-brand-berry', activeText: 'text-brand-berry' },
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

  // Foto confirmación
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [, setUploadingFoto] = useState(false)

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

    // 0. Subir foto (opcional)
    let fotoUrl: string | null = null
    if (fotoFile) {
      setUploadingFoto(true)
      fotoUrl = await uploadEntregaFoto(fotoFile)
      setUploadingFoto(false)
      if (!fotoUrl) {
        setSaving(false)
        setError('No se pudo subir la foto. Intenta de nuevo.')
        return
      }
    }

    // 1. Crear entrega
    const form: EntregaFormData = {
      pedido_id: pedidoId,
      fecha_entrega: fechaEntrega,
      entregado_por: entregadoPor,
      notas,
      estatus,
      foto_url: fotoUrl,
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

  const cobroBalance = total - montoCobro

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Registrar entrega</h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">Confirma la entrega y, si aplica, el cobro</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Pedido */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Pedido *</label>
              {loadingPedidos ? (
                <div className="input w-full animate-pulse bg-brand-cream/60 h-11" />
              ) : pedidos.length === 0 ? (
                <div className="flex items-start gap-2 bg-brand-cream/40 border-2 border-dashed border-brand-wood/15 rounded-xl px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-wood-soft mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <p className="text-xs text-brand-wood-soft font-medium">Sin pedidos confirmados pendientes de entrega.</p>
                </div>
              ) : (
                <select
                  value={pedidoId}
                  onChange={e => setPedidoId(e.target.value)}
                  required
                  className="input"
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
              {/* Tip del pedido seleccionado */}
              {pedidoSel && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-2 ${
                    pedidoSel.cliente?.tipo === 'mayorista' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' :
                    pedidoSel.cliente?.tipo === 'minorista' ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/30' :
                    'bg-brand-coral/15 text-brand-coral border-brand-coral/30'
                  }`}>
                    {pedidoSel.cliente?.tipo ?? 'cliente'}
                  </span>
                  <span className="text-xs text-brand-wood-soft font-semibold">
                    Total pedido: {fmt(calcularTotal(pedidoSel.detalle ?? []))}
                  </span>
                </div>
              )}
            </div>

            {/* Fecha + Entregado por */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Fecha entrega *</label>
                <input type="date" value={fechaEntrega}
                  onChange={e => setFechaEntrega(e.target.value)}
                  required className="input" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Entregado por</label>
                <input type="text" value={entregadoPor}
                  onChange={e => setEntregadoPor(e.target.value)}
                  placeholder="Nombre del repartidor"
                  className="input" />
              </div>
            </div>

            {/* Resultado */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-2">Resultado *</label>
              <div className="grid grid-cols-3 gap-2">
                {ESTATUS_OPTS.map(opt => {
                  const active = estatus === opt.value
                  return (
                    <button key={opt.value} type="button" onClick={() => setEstatus(opt.value)}
                      className={`text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl border-2 transition-all ${
                        active
                          ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-sm`
                          : 'bg-white text-brand-wood-soft border-brand-wood/15 hover:border-brand-wood/40'
                      }`}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Productos */}
            {detalle.length > 0 && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-2">Productos entregados</label>
                <div className="space-y-2">
                  {detalle.map((d, idx) => {
                    const subtotal = d.cantidad * d.precio_unit
                    const entregadoCompleto = d.cantidad === d.cantidad_pedida
                    const entregadoParcial = d.cantidad > 0 && d.cantidad < d.cantidad_pedida
                    return (
                      <div key={d.producto_id} className="flex items-center gap-2 bg-white border-2 border-brand-wood/10 rounded-xl px-3 py-2.5 hover:border-brand-berry/20 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-brand-cream border border-brand-wood/10 flex-shrink-0 overflow-hidden">
                          {d.photo_url
                            ? <img src={d.photo_url} alt={d.nombre} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-brand-wood-soft">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                              </div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-brand-wood truncate">{d.nombre}</p>
                          <p className="text-[10px] text-brand-wood-soft font-semibold">
                            Pedido: {d.cantidad_pedida} {d.unidad} · {fmt(d.precio_unit)}
                          </p>
                        </div>
                        {/* Stepper */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button type="button"
                            onClick={() => setItemCantidad(idx, Math.max(0, d.cantidad - 1))}
                            disabled={estatus === 'fallida'}
                            className="w-7 h-7 rounded-lg bg-brand-cream border border-brand-wood/10 text-brand-wood-soft hover:bg-brand-berry/10 hover:border-brand-berry/30 hover:text-brand-berry flex items-center justify-center font-black transition-colors disabled:opacity-40">
                            −
                          </button>
                          <input
                            type="number" min="0" max={d.cantidad_pedida} value={d.cantidad}
                            onChange={e => setItemCantidad(idx, Number(e.target.value))}
                            onClick={e => (e.target as HTMLInputElement).select()}
                            disabled={estatus === 'fallida'}
                            className={`w-11 text-center text-xs font-black border-2 rounded-lg py-1 bg-white focus:outline-none disabled:opacity-40 ${
                              entregadoCompleto ? 'border-brand-teal/40' :
                              entregadoParcial  ? 'border-brand-coral/40' :
                                                  'border-brand-wood/10'
                            }`}
                          />
                          <button type="button"
                            onClick={() => setItemCantidad(idx, Math.min(d.cantidad_pedida, d.cantidad + 1))}
                            disabled={estatus === 'fallida'}
                            className="w-7 h-7 rounded-lg bg-brand-cream border border-brand-wood/10 text-brand-wood-soft hover:bg-brand-teal/10 hover:border-brand-teal/30 hover:text-brand-teal flex items-center justify-center font-black transition-colors disabled:opacity-40">
                            +
                          </button>
                        </div>
                        <p className="text-xs font-black text-brand-wood flex-shrink-0 w-16 text-right">
                          {fmt(subtotal)}
                        </p>
                      </div>
                    )
                  })}

                  {/* Resumen entregado */}
                  {total > 0 && (
                    <div className="flex items-center justify-between bg-gradient-to-br from-brand-berry/5 to-brand-berry/10 border-2 border-brand-berry/20 rounded-xl px-4 py-3 mt-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-berry/70">Total entregado</p>
                        <p className="text-xs font-bold text-brand-wood">{detalle.filter(d => d.cantidad > 0).length} de {detalle.length} productos</p>
                      </div>
                      <p className="font-display text-2xl font-black bg-gradient-to-r from-brand-berry to-brand-berry-soft bg-clip-text text-transparent">
                        {fmt(total)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Notas</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                rows={2} placeholder="Observaciones de la entrega..."
                className="input resize-none" />
            </div>

            {/* Foto confirmación (opcional) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Foto confirmación (opcional)</label>
              {fotoPreview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-brand-teal/30">
                  <img src={fotoPreview} alt="preview" className="w-full max-h-60 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setFotoFile(null); setFotoPreview(null) }}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-brand-berry rounded-full w-8 h-8 flex items-center justify-center font-black shadow-md"
                  >×</button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-wood/20 rounded-xl px-4 py-6 cursor-pointer hover:border-brand-teal/40 hover:bg-brand-teal/5 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-wood-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  <span className="text-xs font-bold text-brand-wood-soft">Tomar / subir foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setFotoFile(f)
                      setFotoPreview(URL.createObjectURL(f))
                    }}
                  />
                </label>
              )}
            </div>

            {/* ── Cobro al entregar ─────────────────────────────── */}
            <div className={`rounded-2xl border-2 transition-all ${
              cobrar ? 'border-brand-teal/40 bg-brand-teal/5' : 'border-brand-wood/10 bg-brand-cream/20'
            }`}>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => setCobrar(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    cobrar ? 'bg-gradient-to-br from-brand-teal to-brand-teal-soft text-white shadow-md' : 'bg-white border border-brand-wood/10 text-brand-wood-soft'
                  }`}>
                    {ICONS.efectivo}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-brand-wood">¿Se cobró en esta entrega?</p>
                    <p className="text-[10px] text-brand-wood-soft font-semibold">Registra pago inmediato</p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${cobrar ? 'bg-brand-teal' : 'bg-brand-wood/20'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${cobrar ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Detalle del cobro */}
              {cobrar && (
                <div className="px-4 pb-4 space-y-4 border-t border-brand-teal/20">

                  {/* Métodos */}
                  <div className="pt-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-2">Método de pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {METODOS.map(m => {
                        const active = metodoCobro === m.value
                        return (
                          <button key={m.value} type="button" onClick={() => setMetodoCobro(m.value)}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                              active
                                ? 'border-brand-teal bg-white text-brand-teal shadow-sm'
                                : 'border-brand-wood/15 text-brand-wood-soft hover:border-brand-wood/30 bg-white/50'
                            }`}>
                            {ICONS[m.value]}
                            <span className="text-[10px] uppercase tracking-widest font-black">{m.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Monto cobrado *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-wood-soft font-bold">$</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={montoCobro}
                          onChange={e => setMontoCobro(Number(e.target.value))}
                          onClick={e => (e.target as HTMLInputElement).select()}
                          className="input pl-7 font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">
                        Referencia {metodoCobro === 'transferencia' ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        value={referencia}
                        onChange={e => setReferencia(e.target.value)}
                        placeholder={metodoCobro === 'transferencia' ? 'Últimos 4 dígitos...' : 'Opcional'}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Resumen estado del cobro */}
                  {total > 0 && montoCobro === total && (
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-teal bg-brand-teal/10 border-2 border-brand-teal/30 rounded-xl px-3 py-2">
                      <span className="w-5 h-5 rounded-full bg-brand-teal text-white flex items-center justify-center flex-shrink-0">
                        {ICONS.check}
                      </span>
                      Liquidado al 100%
                    </div>
                  )}
                  {total > 0 && montoCobro < total && montoCobro > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-coral bg-brand-coral/10 border-2 border-brand-coral/30 rounded-xl px-3 py-2">
                      <span className="w-5 h-5 rounded-full bg-brand-coral text-white flex items-center justify-center flex-shrink-0">
                        {ICONS.warn}
                      </span>
                      Cobro parcial — quedan {fmt(cobroBalance)} en CxC
                    </div>
                  )}
                  {total > 0 && montoCobro > total && (
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-wood bg-brand-wood/10 border-2 border-brand-wood/30 rounded-xl px-3 py-2">
                      <span className="w-5 h-5 rounded-full bg-brand-wood text-white flex items-center justify-center flex-shrink-0">
                        {ICONS.check}
                      </span>
                      Pago mayor al total (+{fmt(montoCobro - total)})
                    </div>
                  )}
                </div>
              )}
            </div>

            {!cobrar && estatus !== 'fallida' && total > 0 && (
              <div className="flex items-start gap-2 text-xs text-brand-coral bg-brand-coral/10 border-2 border-brand-coral/30 rounded-xl px-3 py-2.5">
                {ICONS.warn}
                <p className="font-semibold">
                  Sin cobro · <span className="font-black">{fmt(total)}</span> quedará como deuda en Cuentas por Cobrar
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-brand-wood/10 flex gap-3 flex-shrink-0 bg-brand-cream/20">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border-2 border-brand-wood/15 rounded-xl text-sm font-black uppercase tracking-widest text-brand-wood-soft hover:bg-white hover:text-brand-wood transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !pedidoId}
              className="flex-[2] btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : (
                <>
                  {cobrar ? 'Registrar entrega + cobro' : 'Registrar entrega'}
                  {total > 0 && ` · ${fmt(total)}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
