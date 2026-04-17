import { useEffect, useState } from 'react'
import { getProductosAdmin, toggleProductoActivo, CATEGORIAS_PRODUCTO } from '../../services/productos'
import type { ProductoConPrecios } from '../../services/productos'
import ProductoModal from '../../components/admin/ProductoModal'
import { formatCurrency } from '../../utils/format'
import { TableRowSkeleton, CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import { useToast } from '../../context/ToastContext'

export default function CatalogoPage() {
  const [productos, setProductos] = useState<ProductoConPrecios[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [modal, setModal] = useState<{ open: boolean; producto?: ProductoConPrecios | null }>({ open: false })
  const toast = useToast()

  useEffect(() => { fetchProductos() }, [])

  async function fetchProductos() {
    setLoading(true)
    try {
      setProductos(await getProductosAdmin())
    } catch {
      toast.error('No se pudo cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(p: ProductoConPrecios) {
    try {
      await toggleProductoActivo(p.id, !p.is_active)
      toast.success(p.is_active ? `${p.name} desactivado` : `${p.name} activado`)
      fetchProductos()
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  const filtrados = productos.filter(p => {
    const matchCat = categoria === 'Todos' || p.category === categoria
    const matchBus = p.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBus
  })

  const CATEGORIAS = ['Todos', ...CATEGORIAS_PRODUCTO]
  const hayFiltro = busqueda.trim() !== '' || categoria !== 'Todos'

  return (
    <div className="space-y-5">

      {/* Título */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Catálogo</h1>
          <p className="text-sm text-brand-wood-soft font-medium mt-1">{productos.length} productos en total</p>
        </div>
        <button
          onClick={() => setModal({ open: true, producto: null })}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="input flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map(cat => (
            <button key={cat} onClick={() => setCategoria(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                categoria === cat
                  ? 'bg-brand-berry text-white shadow-[2px_2px_0_rgba(177,48,107,0.35)]'
                  : 'bg-white border-2 border-brand-wood/15 text-brand-wood hover:border-brand-berry hover:text-brand-berry'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla / Cards */}
      {loading ? (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-brand-wood/10 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </>
      ) : filtrados.length === 0 ? (
        <EmptyState
          tone="berry"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>}
          title={hayFiltro ? 'Sin resultados' : 'Aún no hay productos'}
          description={hayFiltro
            ? 'Probá con otro término o limpiá los filtros para ver todo el catálogo.'
            : 'Dá de alta tu primer producto para que aparezca en el catálogo público y en los pedidos.'}
          action={hayFiltro ? (
            <button onClick={() => { setBusqueda(''); setCategoria('Todos') }} className="btn-secondary text-sm">
              Limpiar filtros
            </button>
          ) : (
            <button onClick={() => setModal({ open: true, producto: null })} className="btn-primary text-sm">
              Crear primer producto
            </button>
          )}
        />
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_24px_rgba(177,48,107,0.06)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-wood/10 bg-brand-cream/40">
                  <th className="text-left px-4 py-3 font-black text-brand-wood text-[10px] uppercase tracking-widest">Producto</th>
                  <th className="text-left px-4 py-3 font-black text-brand-wood text-[10px] uppercase tracking-widest">SKU</th>
                  <th className="text-right px-4 py-3 font-black text-brand-wood text-[10px] uppercase tracking-widest">Minorista</th>
                  <th className="text-right px-4 py-3 font-black text-brand-wood text-[10px] uppercase tracking-widest">Mayorista</th>
                  <th className="text-center px-4 py-3 font-black text-brand-wood text-[10px] uppercase tracking-widest">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-wood/5">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-brand-cream/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-brand-wood">{p.name}</p>
                        <p className="text-xs text-brand-wood-soft mt-0.5">{p.category} · {p.unit}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-wood-soft font-mono text-xs">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-wood">
                      {p.precio_minorista ? formatCurrency(p.precio_minorista) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-teal">
                      {p.precio_mayorista ? formatCurrency(p.precio_mayorista) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(p)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                          p.is_active
                            ? 'bg-brand-teal/10 text-brand-teal border border-brand-teal/30 hover:bg-brand-berry/10 hover:text-brand-berry hover:border-brand-berry/30'
                            : 'bg-brand-wood/5 text-brand-wood-soft border border-brand-wood/15 hover:bg-brand-teal/10 hover:text-brand-teal hover:border-brand-teal/30'
                        }`}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setModal({ open: true, producto: p })}
                        className="text-xs text-brand-berry font-black uppercase tracking-wide hover:opacity-70">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: cards */}
          <div className="md:hidden space-y-2">
            {filtrados.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-brand-wood/10 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-brand-wood text-sm truncate">{p.name}</p>
                    <p className="text-xs text-brand-wood-soft mt-0.5">{p.category} · {p.sku ?? 'sin SKU'}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 border ${
                    p.is_active
                      ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                      : 'bg-brand-wood/5 text-brand-wood-soft border-brand-wood/15'
                  }`}>
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-brand-wood-soft font-bold">Minorista</p>
                      <p className="text-sm font-bold text-brand-wood">{p.precio_minorista ? formatCurrency(p.precio_minorista) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-brand-wood-soft font-bold">Mayorista</p>
                      <p className="text-sm font-bold text-brand-teal">{p.precio_mayorista ? formatCurrency(p.precio_mayorista) : '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(p)}
                      className="text-xs text-brand-wood-soft hover:text-brand-berry font-bold">
                      {p.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => setModal({ open: true, producto: p })}
                      className="text-xs text-brand-berry font-black">
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {modal.open && (
        <ProductoModal
          producto={modal.producto}
          onClose={() => setModal({ open: false })}
          onSaved={() => { setModal({ open: false }); toast.success('Producto guardado'); fetchProductos() }}
        />
      )}
    </div>
  )
}
