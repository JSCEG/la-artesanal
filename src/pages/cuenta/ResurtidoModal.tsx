import { useEffect, useMemo, useState } from 'react'
import { getCatalogoPorLista } from '../../services/productos'
import type { ProductoCatalogo } from '../../services/productos'
import { createPedido } from '../../services/pedidos'
import { validarPromocion } from '../../services/promociones'
import type { ValidacionPromo } from '../../services/promociones'
import { useToast } from '../../context/ToastContext'
import type { Cliente, Sucursal } from '../../services/clientes'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  cliente: Cliente
  userId: string
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

export default function ResurtidoModal({ open, onClose, onCreated, cliente, userId }: Props) {
  const toast = useToast()
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [sucursalId, setSucursalId] = useState<string>('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [busqueda, setBusqueda] = useState('')
  const [codigoPromo, setCodigoPromo] = useState('')
  const [promo, setPromo] = useState<ValidacionPromo | null>(null)
  const [validando, setValidando] = useState(false)

  const sucursales: Sucursal[] = (cliente.sucursales ?? []).filter(s => s.estatus === 'activo')

  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      const data = await getCatalogoPorLista('mayorista')
      setProductos(data)
      setLoading(false)
    })()
    if (sucursales.length && !sucursalId) setSucursalId(sucursales[0].id)
    // fecha entrega default: +2 días
    if (!fechaEntrega) {
      const d = new Date()
      d.setDate(d.getDate() + 2)
      setFechaEntrega(d.toISOString().split('T')[0])
    }
  }, [open])

  const items = useMemo(() =>
    productos
      .filter(p => !busqueda || p.name.toLowerCase().includes(busqueda.toLowerCase()) || p.category.toLowerCase().includes(busqueda.toLowerCase()))
  , [productos, busqueda])

  const seleccion = useMemo(() =>
    productos
      .filter(p => (cantidades[p.id] ?? 0) > 0)
      .map(p => ({ ...p, cantidad: cantidades[p.id] })),
  [productos, cantidades])

  const subtotal = seleccion.reduce((s, p) => s + p.cantidad * p.precio, 0)
  const descuento = (() => {
    if (!promo || promo.error) return 0
    if (promo.tipo === 'porcentaje') return Math.round(subtotal * (promo.valor ?? 0)) / 100 // valor% of subtotal
    return Math.min(promo.valor ?? 0, subtotal)
  })()
  const total = Math.max(0, subtotal - descuento)

  async function aplicarPromo() {
    if (!codigoPromo.trim()) return
    if (subtotal <= 0) { toast.error('Agrega productos antes'); return }
    setValidando(true)
    const res = await validarPromocion(codigoPromo, cliente.tipo, subtotal)
    setValidando(false)
    if (!res) { toast.error('Error validando'); return }
    if (res.error) { toast.error(res.error); setPromo(null); return }
    setPromo(res)
    toast.success(`Descuento aplicado: -${fmt(res.descuento)}`)
  }

  function quitarPromo() {
    setPromo(null)
    setCodigoPromo('')
  }

  function setQty(id: number, n: number) {
    setCantidades(prev => {
      const next = { ...prev }
      if (n <= 0) delete next[id]
      else next[id] = n
      return next
    })
  }

  async function submit() {
    if (!sucursalId) { toast.error('Selecciona sucursal'); return }
    if (seleccion.length === 0) { toast.error('Agrega al menos un producto'); return }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const { error } = await createPedido({
      cliente_id: cliente.id,
      sucursal_id: sucursalId,
      fecha_pedido: today,
      fecha_entrega_programada: fechaEntrega || null,
      notas: notas.trim(),
      promo_id: promo && !promo.error ? promo.id : null,
      descuento_monto: descuento,
      detalle: seleccion.map(p => ({ producto_id: p.id, cantidad: p.cantidad, precio_unit: p.precio })),
    }, userId)
    setSaving(false)
    if (error) {
      toast.error('No se pudo enviar el pedido')
      return
    }
    toast.success('Pedido enviado. Te notificaremos al confirmar.')
    setCantidades({})
    setNotas('')
    onCreated()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-brand-wood/10 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-black text-brand-wood">Solicitar resurtido</h2>
            <p className="text-xs text-brand-wood-soft mt-1">Se enviará como borrador. Un administrador confirmará disponibilidad.</p>
          </div>
          <button onClick={onClose} className="text-brand-wood-soft hover:text-brand-wood text-2xl leading-none">×</button>
        </div>

        <div className="p-5 border-b border-brand-wood/5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Sucursal</label>
            <select value={sucursalId} onChange={e => setSucursalId(e.target.value)} className="input w-full mt-1">
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre_sucursal}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Fecha entrega deseada</label>
            <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} className="input w-full mt-1" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Notas (opcional)</label>
            <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. urgente, dejar con Juan…" className="input w-full mt-1" />
          </div>
          <div className="md:col-span-2">
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto…" className="input w-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-center text-brand-wood-soft py-8">Cargando productos…</p>
          ) : items.length === 0 ? (
            <p className="text-center text-brand-wood-soft py-8">Sin productos</p>
          ) : items.map(p => {
            const qty = cantidades[p.id] ?? 0
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 border border-brand-wood/10 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-brand-cream overflow-hidden flex-shrink-0">
                  {p.photo_url && <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-wood text-sm truncate">{p.name}</p>
                  <p className="text-xs text-brand-wood-soft">{p.category} · {fmt(p.precio)} / {p.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(p.id, qty - 1)} disabled={qty === 0} className="w-8 h-8 rounded-full border border-brand-wood/15 text-brand-wood font-black disabled:opacity-30">−</button>
                  <input
                    type="number"
                    min="0"
                    value={qty}
                    onChange={e => setQty(p.id, parseInt(e.target.value) || 0)}
                    className="w-14 text-center font-black text-brand-wood bg-transparent"
                  />
                  <button onClick={() => setQty(p.id, qty + 1)} className="w-8 h-8 rounded-full bg-brand-wood text-white font-black">+</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-brand-wood/10 bg-brand-cream/30 space-y-3">
          {/* Promo */}
          {promo && !promo.error ? (
            <div className="flex items-center justify-between bg-brand-teal/10 border border-brand-teal/30 rounded-xl px-3 py-2">
              <div>
                <p className="text-xs font-black text-brand-teal">{promo.codigo}</p>
                <p className="text-[10px] text-brand-wood-soft">Descuento: -{fmt(descuento)}</p>
              </div>
              <button onClick={quitarPromo} className="text-brand-berry text-xs font-black">Quitar</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={codigoPromo}
                onChange={e => setCodigoPromo(e.target.value.toUpperCase())}
                placeholder="Código promo (opcional)"
                className="input flex-1 text-sm"
              />
              <button onClick={aplicarPromo} disabled={validando || !codigoPromo.trim()} className="btn-secondary text-xs px-3">
                {validando ? '…' : 'Aplicar'}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-brand-wood">
                {seleccion.length} {seleccion.length === 1 ? 'producto' : 'productos'}
              </p>
              {descuento > 0 && (
                <p className="text-xs text-brand-wood-soft">Subtotal {fmt(subtotal)} · <span className="text-brand-teal font-black">-{fmt(descuento)}</span></p>
              )}
            </div>
            <p className="font-display text-xl font-black text-brand-wood">{fmt(total)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={submit} disabled={saving || seleccion.length === 0} className="btn-primary flex-1">
              {saving ? 'Enviando…' : 'Enviar pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
