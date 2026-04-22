import { useEffect, useState, useMemo } from 'react'
import { getClientes } from '../../services/clientes'
import type { Cliente, Sucursal } from '../../services/clientes'
import { createPedido, calcularTotal } from '../../services/pedidos'
import type { PedidoFormData } from '../../services/pedidos'
import { validarPromocion } from '../../services/promociones'
import type { ValidacionPromo } from '../../services/promociones'
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
  photo_url: string | null
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
  const [codigoPromo, setCodigoPromo] = useState('')
  const [promo, setPromo] = useState<ValidacionPromo | null>(null)
  const [validandoPromo, setValidandoPromo] = useState(false)
  const [sucursalId, setSucursalId] = useState('')
  const [fechaPedido, setFechaPedido] = useState(new Date().toISOString().split('T')[0])
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')

  // Líneas del pedido
  const [lineas, setLineas] = useState<LineaPedido[]>([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productosPanelOpen, setProductosPanelOpen] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas')
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

  // Categorías disponibles
  const categorias = useMemo(() => {
    const set = new Set<string>(productos.map(p => p.category))
    return ['Todas', ...Array.from(set).sort()]
  }, [productos])

  // Productos filtrados para el panel
  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.toLowerCase()
    return productos.filter(p => {
      const matchBus = !q || p.name.toLowerCase().includes(q)
      const matchCat = categoriaActiva === 'Todas' || p.category === categoriaActiva
      return matchBus && matchCat
    })
  }, [productos, busquedaProducto, categoriaActiva])

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
        photo_url: p.photo_url,
        cantidad: qty,
        precio_unit: precioSugerido(p),
      }])
    }
    setCantCatalogo(prev => ({ ...prev, [p.id]: 1 }))
  }

  function setLinea(id: number, field: 'cantidad' | 'precio_unit', val: number) {
    setLineas(prev => prev.map(l => l.producto_id === id ? { ...l, [field]: val } : l))
  }

  function quitarLinea(id: number) {
    setLineas(prev => prev.filter(l => l.producto_id !== id))
  }

  const subtotal = calcularTotal(lineas)
  const nLineas = lineas.length
  const nUnidades = lineas.reduce((sum, l) => sum + l.cantidad, 0)

  const descuento = (() => {
    if (!promo || promo.error) return 0
    if (promo.tipo === 'porcentaje') return Math.round(subtotal * (promo.valor ?? 0)) / 100
    return Math.min(promo.valor ?? 0, subtotal)
  })()
  const total = Math.max(0, subtotal - descuento)

  async function aplicarPromo() {
    if (!codigoPromo.trim()) return
    if (subtotal <= 0) { setError('Agrega productos antes'); return }
    setValidandoPromo(true)
    const res = await validarPromocion(codigoPromo, clienteSeleccionado?.tipo ?? '', subtotal)
    setValidandoPromo(false)
    if (!res) { setError('Error validando código'); return }
    if (res.error) { setError(res.error); setPromo(null); return }
    setError('')
    setPromo(res)
  }

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
      promo_id: promo && !promo.error ? promo.id : null,
      descuento_monto: descuento,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Nuevo pedido</h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">Registra una venta o distribución</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>

        {loadingMaestros ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-brand-berry/20 border-t-brand-berry rounded-full animate-spin mx-auto mb-3" />
              <p className="text-brand-wood-soft text-sm font-semibold">Cargando catálogo...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ── Cliente + Sucursal ────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Cliente *</label>
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
                  {clienteSeleccionado && (
                    <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-2 ${
                      clienteSeleccionado.tipo === 'mayorista' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' :
                      clienteSeleccionado.tipo === 'minorista' ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/30' :
                      'bg-brand-coral/15 text-brand-coral border-brand-coral/30'
                    }`}>
                      {clienteSeleccionado.tipo} — precios {clienteSeleccionado.tipo === 'mayorista' ? 'mayorista' : 'minorista'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Sucursal</label>
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
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Fecha del pedido</label>
                  <input type="date" value={fechaPedido}
                    onChange={e => setFechaPedido(e.target.value)} className="input" />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Entrega programada</label>
                  <input type="date" value={fechaEntrega}
                    onChange={e => setFechaEntrega(e.target.value)} className="input" />
                </div>
              </div>

              {/* ── Productos ────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70">Productos *</label>
                  <button type="button"
                    onClick={() => setProductosPanelOpen(o => !o)}
                    className="text-xs font-black text-brand-berry hover:text-brand-berry-soft flex items-center gap-1 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${productosPanelOpen ? 'rotate-45' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                    {productosPanelOpen ? 'Cerrar catálogo' : 'Agregar productos'}
                  </button>
                </div>

                {/* Panel catálogo */}
                {productosPanelOpen && (
                  <div className="border-2 border-brand-wood/10 rounded-2xl overflow-hidden mb-3 bg-brand-cream/20">
                    {/* Búsqueda + categorías */}
                    <div className="p-3 border-b border-brand-wood/10 bg-white space-y-2">
                      <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-wood-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          value={busquedaProducto}
                          onChange={e => setBusquedaProducto(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border-2 border-brand-wood/15 bg-white focus:outline-none focus:border-brand-berry focus:ring-2 focus:ring-brand-berry/15 transition-all"
                        />
                      </div>
                      {/* Chips de categoría */}
                      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
                        {categorias.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoriaActiva(cat)}
                            className={`shrink-0 text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full border-2 transition-all ${
                              categoriaActiva === cat
                                ? 'bg-brand-berry text-white border-brand-berry'
                                : 'bg-white text-brand-wood-soft border-brand-wood/15 hover:border-brand-berry/40'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Lista productos */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-brand-wood/5">
                      {productosFiltrados.length === 0 ? (
                        <p className="p-6 text-center text-sm text-brand-wood-soft">Sin resultados</p>
                      ) : productosFiltrados.map(p => {
                        const enPedido = lineas.find(l => l.producto_id === p.id)
                        const precio = precioSugerido(p)
                        return (
                          <div key={p.id}
                            className="flex items-center gap-2 px-3 py-2.5 hover:bg-white transition-colors">
                            {/* Miniatura */}
                            <div className="w-10 h-10 rounded-xl bg-white flex-shrink-0 overflow-hidden border border-brand-wood/10">
                              {p.photo_url ? (
                                <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-brand-wood-soft">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                </div>
                              )}
                            </div>
                            {/* Nombre + precio */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-brand-wood truncate">{p.name}</p>
                              <p className="text-xs text-brand-wood-soft font-medium">{fmt(precio)} / {p.unit}</p>
                            </div>
                            {/* Ya en pedido */}
                            {enPedido && (
                              <span className="text-[10px] font-black text-brand-teal flex-shrink-0 bg-brand-teal/10 border border-brand-teal/30 px-2 py-0.5 rounded-full">
                                ✓ {enPedido.cantidad}
                              </span>
                            )}
                            {/* Input cantidad + botón */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={getCantCatalogo(p.id)}
                                onChange={e => setCantidad(p.id, Number(e.target.value))}
                                onClick={e => (e.target as HTMLInputElement).select()}
                                className="w-12 text-center text-sm font-bold border-2 border-brand-wood/15 rounded-lg py-1 bg-white focus:outline-none focus:border-brand-berry"
                              />
                              <button
                                type="button"
                                onClick={() => agregarProducto(p)}
                                className="text-[10px] uppercase tracking-widest bg-gradient-to-br from-brand-berry to-brand-berry-soft text-white font-black px-2.5 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap shadow-[2px_2px_0_rgba(177,48,107,0.25)]"
                              >
                                {enPedido ? '+ más' : 'Agregar'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Líneas del pedido */}
                {lineas.length === 0 ? (
                  <div className="border-2 border-dashed border-brand-wood/20 rounded-2xl p-8 text-center bg-brand-cream/20">
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-brand-wood/10 flex items-center justify-center mx-auto mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-wood-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    </div>
                    <p className="text-sm font-bold text-brand-wood mb-1">Sin productos en el pedido</p>
                    <p className="text-xs text-brand-wood-soft">Abre el catálogo para agregar productos.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lineas.map(linea => (
                      <div key={linea.producto_id}
                        className="flex items-center gap-2 bg-white border-2 border-brand-wood/10 rounded-xl px-3 py-2 hover:border-brand-berry/30 transition-colors">
                        {/* Miniatura */}
                        <div className="w-9 h-9 rounded-lg bg-brand-cream flex-shrink-0 overflow-hidden border border-brand-wood/10">
                          {linea.photo_url ? (
                            <img src={linea.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-wood-soft">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            </div>
                          )}
                        </div>
                        {/* Nombre */}
                        <p className="text-xs font-bold text-brand-wood flex-1 min-w-0 truncate">
                          {linea.nombre}
                          <span className="text-brand-wood-soft font-medium ml-1">({linea.unit})</span>
                        </p>
                        {/* Stepper */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button type="button"
                            onClick={() => linea.cantidad > 1
                              ? setLinea(linea.producto_id, 'cantidad', linea.cantidad - 1)
                              : quitarLinea(linea.producto_id)
                            }
                            className="w-7 h-7 rounded-lg bg-brand-cream border border-brand-wood/10 text-brand-wood-soft hover:bg-brand-berry/10 hover:border-brand-berry/30 hover:text-brand-berry flex items-center justify-center font-black transition-colors">
                            −
                          </button>
                          <input
                            type="number" min="1" step="1"
                            value={linea.cantidad}
                            onChange={e => setLinea(linea.producto_id, 'cantidad', Math.max(1, Number(e.target.value)))}
                            className="w-11 text-center text-xs font-black border-2 border-brand-wood/10 rounded-lg py-1 bg-white focus:outline-none focus:border-brand-berry"
                          />
                          <button type="button"
                            onClick={() => setLinea(linea.producto_id, 'cantidad', linea.cantidad + 1)}
                            className="w-7 h-7 rounded-lg bg-brand-cream border border-brand-wood/10 text-brand-wood-soft hover:bg-brand-teal/10 hover:border-brand-teal/30 hover:text-brand-teal flex items-center justify-center font-black transition-colors">
                            +
                          </button>
                        </div>
                        {/* Precio */}
                        <div className="relative flex-shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-brand-wood-soft">$</span>
                          <input
                            type="number" min="0" step="0.5"
                            value={linea.precio_unit}
                            onChange={e => setLinea(linea.producto_id, 'precio_unit', Number(e.target.value))}
                            className="w-20 pl-5 pr-2 text-right text-xs font-mono font-bold border-2 border-brand-wood/10 rounded-lg py-1 bg-white focus:outline-none focus:border-brand-berry"
                          />
                        </div>
                        {/* Subtotal */}
                        <p className="text-xs font-black text-brand-wood flex-shrink-0 w-16 text-right">
                          {fmt(linea.cantidad * linea.precio_unit)}
                        </p>
                        {/* Remove */}
                        <button type="button" onClick={() => quitarLinea(linea.producto_id)}
                          aria-label="Quitar producto"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-wood/30 hover:bg-brand-berry/5 hover:text-brand-berry transition-colors flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                        </button>
                      </div>
                    ))}

                    {/* Promo */}
                    {promo && !promo.error ? (
                      <div className="flex items-center justify-between bg-brand-teal/10 border-2 border-brand-teal/30 rounded-xl px-3 py-2 mt-3">
                        <div>
                          <p className="text-xs font-black text-brand-teal">{promo.codigo}</p>
                          <p className="text-[10px] text-brand-wood-soft">Descuento: -{fmt(descuento)}</p>
                        </div>
                        <button type="button" onClick={() => { setPromo(null); setCodigoPromo('') }} className="text-brand-berry text-xs font-black">Quitar</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          value={codigoPromo}
                          onChange={e => setCodigoPromo(e.target.value.toUpperCase())}
                          placeholder="Código promo (opcional)"
                          className="input flex-1 text-sm"
                        />
                        <button type="button" onClick={aplicarPromo} disabled={validandoPromo || !codigoPromo.trim()} className="btn-secondary text-xs px-3">
                          {validandoPromo ? '…' : 'Aplicar'}
                        </button>
                      </div>
                    )}

                    {/* Resumen */}
                    <div className="flex items-center justify-between bg-gradient-to-br from-brand-berry/5 to-brand-berry/10 border-2 border-brand-berry/20 rounded-xl px-4 py-3 mt-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-berry/70">Resumen</p>
                        <p className="text-xs font-bold text-brand-wood">{nLineas} {nLineas === 1 ? 'producto' : 'productos'} · {nUnidades} {nUnidades === 1 ? 'unidad' : 'unidades'}</p>
                        {descuento > 0 && <p className="text-[10px] text-brand-teal font-black">Subtotal {fmt(subtotal)} − {fmt(descuento)}</p>}
                      </div>
                      <p className="font-display text-2xl font-black bg-gradient-to-r from-brand-berry to-brand-berry-soft bg-clip-text text-transparent">
                        {fmt(total)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)}
                  className="input resize-none h-16" placeholder="Instrucciones especiales, observaciones..." />
              </div>

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
              <button type="submit" disabled={loading || lineas.length === 0}
                className="flex-[2] btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Guardando...' : `Crear pedido${total > 0 ? ` · ${fmt(total)}` : ''}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
