import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/Navbar'
import { getCatalogoPorLista } from '../../services/productos'
import type { ProductoCatalogo } from '../../services/productos'
import { useCart } from '../../context/CartContext'
import CarritoDrawer from './CarritoDrawer'
import { useToast } from '../../context/ToastContext'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

export default function TiendaPage() {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<string>('todas')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { add, count } = useCart()
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const data = await getCatalogoPorLista('minorista')
      setProductos(data)
      setLoading(false)
    })()
  }, [])

  const categorias = useMemo(() => ['todas', ...Array.from(new Set(productos.map(p => p.category)))], [productos])

  const items = useMemo(() => productos.filter(p => {
    if (categoria !== 'todas' && p.category !== categoria) return false
    if (busqueda && !p.name.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  }), [productos, categoria, busqueda])

  function handleAdd(p: ProductoCatalogo) {
    add(p, 1)
    toast.success(`${p.name} agregado`)
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-brand-wood">Tienda</h1>
            <p className="text-sm text-brand-wood-soft font-medium mt-1">Paletas, nieves y helados artesanales</p>
          </div>
          <button onClick={() => setDrawerOpen(true)} className="btn-primary relative">
            🛒 Carrito
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-wood text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center">{count}</span>
            )}
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-5 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            className="input flex-1 min-w-[200px]"
          />
          <div className="flex gap-2 flex-wrap">
            {categorias.map(c => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border transition-all ${
                  categoria === c
                    ? 'bg-brand-wood text-white border-brand-wood'
                    : 'bg-white text-brand-wood border-brand-wood/15 hover:border-brand-wood/40'
                }`}
              >{c}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-brand-wood-soft py-12">Cargando productos…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-brand-wood-soft py-12">Sin productos</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-brand-wood/10 overflow-hidden shadow-[0_4px_20px_rgba(177,48,107,0.04)] hover:shadow-[0_8px_30px_rgba(177,48,107,0.12)] transition-shadow flex flex-col">
                <div className="aspect-square bg-brand-cream overflow-hidden">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍦</div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">{p.category}</p>
                  <p className="font-bold text-brand-wood text-sm mt-0.5 line-clamp-2">{p.name}</p>
                  <div className="flex items-center justify-between mt-auto pt-3">
                    <p className="font-display text-lg font-black text-brand-berry">{fmt(p.precio)}</p>
                    <button onClick={() => handleAdd(p)} className="bg-brand-wood text-white font-black text-xs rounded-full w-8 h-8 hover:bg-brand-wood/90 transition-colors">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CarritoDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
