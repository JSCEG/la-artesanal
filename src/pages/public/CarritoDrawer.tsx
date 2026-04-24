import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useSession } from '../../hooks/useSession'
import { useToast } from '../../context/ToastContext'
import { getMiCliente } from '../../services/clientes'
import { createPedido } from '../../services/pedidos'

interface Props { open: boolean; onClose: () => void }

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

export default function CarritoDrawer({ open, onClose }: Props) {
  const { items, setQty, remove, subtotal, clear } = useCart()
  const { session } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [notas, setNotas] = useState('')

  async function checkout() {
    if (!session?.user?.email) {
      toast.error('Inicia sesión para confirmar tu pedido')
      onClose()
      navigate('/login')
      return
    }
    if (items.length === 0) { toast.error('Carrito vacío'); return }
    setSubmitting(true)
    const cliente = await getMiCliente(session.user.email)
    if (!cliente) {
      setSubmitting(false)
      toast.error('No encontramos tu cuenta de cliente')
      return
    }
    const matriz = (cliente.sucursales ?? []).find(s => s.es_matriz && s.estatus === 'activo')
      ?? (cliente.sucursales ?? []).find(s => s.estatus === 'activo')
    if (!matriz) {
      setSubmitting(false)
      toast.error('No hay sucursal activa')
      return
    }
    const today = new Date().toISOString().split('T')[0]
    const { error } = await createPedido({
      cliente_id: cliente.id,
      sucursal_id: matriz.id,
      fecha_pedido: today,
      fecha_entrega_programada: null,
      notas: notas.trim(),
      promo_id: null,
      descuento_monto: 0,
      detalle: items.map(i => ({ producto_id: i.id, cantidad: i.cantidad, precio_unit: i.precio })),
    }, session.user.id)
    setSubmitting(false)
    if (error) { toast.error('No se pudo enviar el pedido'); return }
    toast.success('Pedido enviado. Te notificaremos al confirmar.')
    clear()
    setNotas('')
    onClose()
    navigate('/cuenta')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center md:justify-end">
      <div className="bg-white w-full md:max-w-md md:h-full md:rounded-none rounded-t-3xl max-h-[95vh] md:max-h-full flex flex-col overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-brand-wood/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-black text-brand-wood">Tu carrito</h2>
          <button onClick={onClose} className="text-brand-wood-soft hover:text-brand-wood text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 ? (
            <p className="text-center text-brand-wood-soft py-12">Carrito vacío</p>
          ) : items.map(it => (
            <div key={it.id} className="flex items-center gap-3 p-3 border border-brand-wood/10 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-brand-cream overflow-hidden flex-shrink-0">
                {it.photo_url && <img src={it.photo_url} alt={it.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-wood text-sm truncate">{it.name}</p>
                <p className="text-xs text-brand-wood-soft">{fmt(it.precio)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setQty(it.id, it.cantidad - 1)} className="w-7 h-7 rounded-full border border-brand-wood/15 text-brand-wood font-black">−</button>
                <input
                  type="number"
                  min="0"
                  value={it.cantidad}
                  onChange={e => setQty(it.id, parseInt(e.target.value) || 0)}
                  className="w-10 text-center font-black text-brand-wood bg-transparent text-sm"
                />
                <button onClick={() => setQty(it.id, it.cantidad + 1)} className="w-7 h-7 rounded-full bg-brand-wood text-white font-black">+</button>
              </div>
              <button onClick={() => remove(it.id)} className="text-brand-berry text-xs font-black ml-1">✕</button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-brand-wood/10 bg-brand-cream/30 space-y-3">
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas (opcional)"
              className="input w-full text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-brand-wood-soft">Subtotal</p>
              <p className="font-display text-xl font-black text-brand-wood">{fmt(subtotal)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={clear} disabled={submitting} className="btn-secondary flex-1">Vaciar</button>
              <button onClick={checkout} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Enviando…' : session ? 'Confirmar pedido' : 'Inicia sesión'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
