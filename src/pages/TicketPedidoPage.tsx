import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPedido, calcularTotal } from '../services/pedidos'
import type { Pedido } from '../services/pedidos'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function TicketPedidoPage() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const p = await getPedido(id)
      if (!p) setNotFound(true)
      else setPedido(p)
      setLoading(false)
    })()
  }, [id])

  // Auto-print cuando termina de cargar
  useEffect(() => {
    if (pedido && !loading) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [pedido, loading])

  if (loading) return <div className="p-10 text-center text-brand-wood-soft">Cargando…</div>
  if (notFound || !pedido) return <div className="p-10 text-center text-brand-berry">Pedido no encontrado</div>

  const subtotal = calcularTotal(pedido.detalle ?? [])
  const descuento = Number(pedido.descuento_monto ?? 0)
  const total = Math.max(0, subtotal - descuento)

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <style>{`
        @media print {
          @page { size: auto; margin: 12mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toolbar (oculta al imprimir) */}
      <div className="no-print sticky top-0 bg-brand-cream/80 backdrop-blur border-b border-brand-wood/10 px-4 py-3 flex gap-2 justify-end">
        <button onClick={() => window.print()} className="btn-primary text-sm">Imprimir / PDF</button>
        <button onClick={() => window.close()} className="btn-secondary text-sm">Cerrar</button>
      </div>

      <div className="max-w-2xl mx-auto p-6 md:p-10 font-sans text-brand-wood">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b-2 border-brand-wood pb-4">
          <div>
            <h1 className="font-display text-3xl font-black">La Artesanal</h1>
            <p className="text-xs text-brand-wood-soft">Paletas, nieves y helados artesanales</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest font-black text-brand-wood-soft">Pedido</p>
            <p className="font-mono text-sm font-black">{pedido.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs mt-1">{fmtFecha(pedido.fecha_pedido)}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-brand-wood-soft">Cliente</p>
            <p className="font-bold">{pedido.cliente?.nombre_comercial ?? '—'}</p>
            {pedido.sucursal && <p className="text-xs text-brand-wood-soft mt-0.5">Sucursal: {pedido.sucursal.nombre_sucursal}</p>}
            {pedido.cliente?.tipo && <p className="text-xs text-brand-wood-soft capitalize">Tipo: {pedido.cliente.tipo}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest font-black text-brand-wood-soft">Entrega programada</p>
            <p className="font-bold">{pedido.fecha_entrega_programada ? fmtFecha(pedido.fecha_entrega_programada) : '—'}</p>
            <p className="text-xs text-brand-wood-soft capitalize mt-1">Estatus: {pedido.estatus.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Detalle */}
        <table className="w-full mt-6 text-sm">
          <thead>
            <tr className="border-b-2 border-brand-wood/40 text-[10px] uppercase tracking-widest text-brand-wood-soft">
              <th className="text-left py-2">Producto</th>
              <th className="text-right py-2 w-20">Cant.</th>
              <th className="text-right py-2 w-24">P. Unit.</th>
              <th className="text-right py-2 w-28">Importe</th>
            </tr>
          </thead>
          <tbody>
            {(pedido.detalle ?? []).map(d => (
              <tr key={d.id} className="border-b border-brand-wood/10">
                <td className="py-2">
                  <p className="font-bold">{d.producto?.name ?? `Producto #${d.producto_id}`}</p>
                  <p className="text-xs text-brand-wood-soft">{d.producto?.unit ?? 'pz'}</p>
                </td>
                <td className="py-2 text-right font-mono">{d.cantidad}</td>
                <td className="py-2 text-right font-mono">{fmt(d.precio_unit)}</td>
                <td className="py-2 text-right font-mono font-bold">{fmt(d.cantidad * d.precio_unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="mt-4 ml-auto w-64 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-brand-wood-soft">Subtotal</span>
            <span className="font-mono">{fmt(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-brand-teal">
              <span>Descuento</span>
              <span className="font-mono">−{fmt(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t-2 border-brand-wood font-black text-lg">
            <span>Total</span>
            <span className="font-mono">{fmt(total)}</span>
          </div>
        </div>

        {pedido.notas && (
          <div className="mt-6 text-sm border-t border-brand-wood/20 pt-3">
            <p className="text-[10px] uppercase tracking-widest font-black text-brand-wood-soft mb-1">Notas</p>
            <p className="italic text-brand-wood-soft">{pedido.notas}</p>
          </div>
        )}

        <div className="mt-10 text-center text-[10px] text-brand-wood-soft">
          Generado el {new Date().toLocaleString('es-MX')} · laartesanal
        </div>
      </div>
    </div>
  )
}
