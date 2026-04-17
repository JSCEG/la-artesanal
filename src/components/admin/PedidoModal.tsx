import { useEffect, useState, useMemo } from 'react'
import { getClientes } from '../../services/clientes'
import type { Cliente, Sucursal } from '../../services/clientes'
import { createPedido, calcularTotal } from '../../services/pedidos'
import type { PedidoFormData } from '../../services/pedidos'
import { useSession } from '../../hooks/useSession'
import { supabase } from '../../services/supabase'

interface Props {
  onClose: () => void
  onSaved: () => void
}

interface Producto {
  id: number
  name: string
  category: string
  unit: string
  photo_url: string | null
  precio_mayorista: number | null
  precio_minorista: number | null
}

interface LineaPedido {
  producto_id: number
  nombre: string
  unit: string
  cantidad: number
  precio_unit: number
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

export default function PedidoModal({ onClose, onSaved }: Props) {
  const { profile } = useSession()

  // Datos maestros
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loadingMaestros, setLoadingMaestros] = useState(true)

  // Formulario
  const [clienteId, setClienteId] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [fechaPedido, setFechaPedido] = useState(new Date().toISOString().split('T')[0])
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')

  // Líneas del pedido
  const [lineas, setLineas] = useState<LineaPedido[]>([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productosPanelOpen, setProductosPanelOpen] = useState(false)
  // Cantidades en el catálogo (productId → qty antes de agregar)
  const [cantCatalogo, setCantCatalogo] = useState<Record<number, number>>({})

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cargar maestros en paralelo
  useEffect(() => {
    Promise.all([
      getClientes(),
      supabase
        .from('products')
        .select('id, name, category, unit, photo_url, product_prices(amount, price_lists(code))')
        .eq('is_active', true)
        .order('category')
        .then(({ data }) => data ?? []),
    ]).then(([cs, ps]) => {
      setClientes(cs)
      // Aplanar precios en el producto
      setProductos((ps as any[]).map(p => {
        const precios = (p.product_prices ?? [])
        const mayor = precios.find((x: any) => x.price_lists?.code === 'mayorista')
        const minor = precios.find((x: any) => x.price_lists?.code === 'minorista')
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          photo_url: p.photo_url,
          precio_mayorista: mayor ? Number(mayor.amount) : null,
          precio_minorista: minor ? Number(minor.amount) : null,
        }
      }))
      setLoadingMaestros(false)
    })
  }, [])

  // Cliente y sus sucursales
  const clienteSeleccionado = clientes.find(c => c.id === clienteId)
  const sucursales: Sucursal[] = clienteSeleccionado?.sucursales ?? []

  // Precio sugerido según tipo de cliente
  function precioSugerido(p: Producto): number {
    if (clienteSeleccionado?.tipo === 'mayorista') return p.precio_mayorista ?? p.precio_minorista ?? 0
    return p.precio_minorista ?? p.precio_mayorista ?? 0
  }

  // Productos filtrados para el panel
  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.toLowerCase()
    return productos.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    )
  }, [productos, busquedaProducto])

  // Agrupar por categoría
  const porCategoria = useMemo(() => {
    const map = new Map<string, Producto[]>()
    for (const p of productosFiltrados) {
      const arr = map.get(p.category) ?? []
      arr.push(p)
      map.set(p.category, arr)
    }
    return map
  }, [productosFiltrados])

  function getCantCatalogo(id: number) { return cantCatalogo[id] ?? 1 }
  function setCantidad(id: number, val: number) {
    setCantCatalogo(prev => ({ ...prev, [id]: Math.max(1, val) }))
  }

  function agregarProducto(p: Producto) {
    const qty = getCantCatalogo(p.id)
    const ya = lineas.find(l => l.producto_id === p.id)
    if (ya) {
      setLineas(prev => prev.map(l =>
        l.producto_id === p.id ? { ...l, cantidad: l.cantidad + qty } : l
      ))
    } else {
      setLineas(prev => [...prev, {
        producto_id: p.id,
        nombre: p.name,
        unit: p.unit,
        cantidad: qty,
        precio_unit: precioSugerido(p),
      }])
    }
    // Reset la cantidad del catálogo para ese producto
    setCantCatalogo(prev => ({ ...prev, [p.id]: 1 }))
  }

  function setLinea(id: number, field: 'cantidad' | 'precio_unit', val: number) {
    setLineas(prev => prev.map(l => l.producto_id === id ? { ...l, [field]: val } : l))
  }

  function quitarLinea(id: number) {
    setLineas(prev => prev.filter(l => l.producto_id !== id))
  }

  const total = calcularTotal(lineas)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (lineas.length === 0) { setError('Agrega al menos un producto'); return }
    if (!profile?.id) { setError('Sin sesión activa'); return }

    setLoading(true)
    setError('')

    const form: PedidoFormData = {
      cliente_id: clienteId,
      sucursal_id: sucursalId || null,
      fecha_pedido: fechaPedido,
      fecha_entrega_programada: fechaEntrega || null,
      notas,
      detalle: lineas.map(l => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unit: l.precio_unit,
      })),
    }

    const { error } = await createPedido(form, profile.id)
    if (error) { setError(error.message); setLoading(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-black text-brand-coffee text-lg">Nuevo pedido</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">×</button>
        </div>

        {loadingMaestros ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm animate-pulse">Cargando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* ── Cliente + Sucursal ────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Cliente *</label>
                  <select
                    value={clienteId}
                    onChange={e => { setClienteId(e.target.value); setSucursalId('') }}
                    className="input"
                    required
                  >
                    <option value="">— Seleccionar —</option>
                    {clientes.filter(c => c.activo).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_comercial}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Sucursal</label>
                  <select
                    value={sucursalId}
                    onChange={e => setSucursalId(e.target.value)}
                    className="input"
                    disabled={!clienteId || sucursales.length === 0}
                  >
                    <option value="">— Sin especificar —</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre_sucursal}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Fecha del pedido</label>
                  <input type="date" value={fechaPedido}
                    onChange={e => setFechaPedido(e.target.value)} className="input" />
                </div>

                <div>
                  <label className="label">Entrega programada</label>
                  <input type="date" value={fechaEntrega}
                    onChange={e => setFechaEntrega(e.target.value)} className="input" />
                </div>
              </div>

              {/* ── Productos ────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Productos *</label>
                  <button type="button"
                    onClick={() => setProductosPanelOpen(o => !o)}
                    className="text-xs text-brand-ocean font-bold hover:opacity-70">
                    {productosPanelOpen ? '▲ cerrar catálogo' : '+ agregar producto'}
                  </button>
                </div>

                {/* Panel catálogo */}
                {productosPanelOpen && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={busquedaProducto}
                        onChange={e => setBusquedaProducto(e.target.value)}
                        className="input py-1.5 text-xs"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                      {Array.from(porCategoria.entries()).map(([cat, prods]) => (
                        <div key={cat}>
                          <p className="px-3 py-1 text-xs font-bold text-gray-400 bg-gray-50 sticky top-0">
                            {cat}
                          </p>
                          {prods.map(p => {
                            const enPedido = lineas.find(l => l.producto_id === p.id)
                            const precio = precioSugerido(p)
                            return (
                              <div key={p.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
                                {/* Miniatura */}
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                  {p.photo_url
                                    ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                                    : <span className="w-full h-full flex items-center justify-center text-sm">🍦</span>
                                  }
                                </div>
                                {/* Nombre + precio */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-700 truncate">{p.name}</p>
                                  <p className="text-xs text-gray-400">{fmt(precio)} / {p.unit}</p>
                                </div>
                                {/* Ya en pedido */}
                                {enPedido && (
                                  <span className="text-xs font-bold text-brand-berry flex-shrink-0 bg-brand-berry/10 px-1.5 py-0.5 rounded-full">
                                    ✓{enPedido.cantidad}
                                  </span>
                                )}
                                {/* Input cantidad + botón */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <input
                                    type="number"
                                    min="1"
                                    value={getCantCatalogo(p.id)}
                                    onChange={e => setCantidad(p.id, Number(e.target.value))}
                                    onClick={e => (e.target as HTMLInputElement).select()}
                                    className="w-14 text-center text-xs font-bold border border-gray-200 rounded-lg py-1 bg-white focus:outline-none focus:border-brand-ocean"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => agregarProducto(p)}
                                    className="text-xs bg-brand-ocean text-white font-bold px-2 py-1 rounded-lg hover:opacity-90 whitespace-nowrap"
                                  >
                                    {enPedido ? '+ más' : 'Agregar'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Líneas del pedido */}
                {lineas.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-400">Sin productos. Abre el catálogo para agregar.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lineas.map(linea => (
                      <div key={linea.producto_id}
                        className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-xs font-semibold text-gray-700 flex-1 min-w-0 truncate">
                          {linea.nombre}
                          <span className="text-gray-400 font-normal ml-1">({linea.unit})</span>
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button type="button"
                            onClick={() => linea.cantidad > 1
                              ? setLinea(linea.producto_id, 'cantidad', linea.cantidad - 1)
                              : quitarLinea(linea.producto_id)
                            }
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-500 font-bold text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 flex items-center justify-center">
                            −
                          </button>
                          <input
                            type="number" min="1" step="1"
                            value={linea.cantidad}
                            onChange={e => setLinea(linea.producto_id, 'cantidad', Math.max(1, Number(e.target.value)))}
                            className="w-12 text-center text-xs font-bold border border-gray-200 rounded-lg py-1 bg-white"
                          />
                          <button type="button"
                            onClick={() => setLinea(linea.producto_id, 'cantidad', linea.cantidad + 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-500 font-bold text-sm hover:bg-brand-ocean/10 hover:border-brand-ocean/30 hover:text-brand-ocean flex items-center justify-center">
                            +
                          </button>
                        </div>
                        <input
                          type="number" min="0" step="0.5"
                          value={linea.precio_unit}
                          onChange={e => setLinea(linea.producto_id, 'precio_unit', Number(e.target.value))}
                          className="w-20 text-right text-xs font-mono border border-gray-200 rounded-lg py-1 px-2 bg-white flex-shrink-0"
                        />
                        <button type="button" onClick={() => quitarLinea(linea.producto_id)}
                          className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0 ml-1">✕</button>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex justify-end pt-1">
                      <p className="text-sm font-black text-brand-coffee">
                        Total: {fmt(total)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="label">Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)}
                  className="input resize-none h-14" placeholder="Instrucciones especiales, observaciones..." />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={loading || lineas.length === 0}
                className="flex-1 py-2.5 bg-brand-berry text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
                {loading ? 'Guardando...' : `Crear pedido${total > 0 ? ` · ${fmt(total)}` : ''}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
