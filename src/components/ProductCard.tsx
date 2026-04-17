import { formatCurrency } from '../utils/format'
import type { Producto } from '../hooks/useCatalogo'
import type { Profile } from '../types'

interface Props {
  producto: Producto
  profile: Profile | null
  onPedir: (producto: Producto) => void
}

const EMOJI: Record<string, string> = {
  Paletas: '🍡',
  Nieves: '🍦',
  Litros: '🧊',
  Cafe: '☕',
}

export default function ProductCard({ producto, profile, onPedir }: Props) {
  const esMayorista = profile?.commercial_profile === 'mayorista'
  const precio = esMayorista ? producto.precio_mayorista : producto.precio_minorista
  const etiqueta = esMayorista ? 'Precio mayorista' : 'Precio'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">

      {/* Foto o emoji */}
      {producto.photo_url ? (
        <div className="w-full h-36 overflow-hidden bg-brand-cream flex-shrink-0">
          <img src={producto.photo_url} alt={producto.name}
            className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-24 bg-brand-cream flex items-center justify-center text-4xl flex-shrink-0">
          {EMOJI[producto.category] ?? '🍬'}
        </div>
      )}

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <p className="text-xs font-semibold text-brand-berry uppercase tracking-wide mb-1">
            {producto.category}
          </p>
          <h3 className="font-black text-brand-coffee text-base leading-tight">{producto.name}</h3>
          {producto.description && (
            <p className="text-sm text-gray-500 mt-1 leading-snug">{producto.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400">{etiqueta}</p>
            <p className="font-black text-brand-coffee text-lg">
              {precio ? formatCurrency(precio) : '—'}
              <span className="text-xs font-normal text-gray-400 ml-1">/ {producto.unit}</span>
            </p>
          </div>
          <button
            onClick={() => onPedir(producto)}
            className="bg-brand-berry text-white text-sm font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            Pedir
          </button>
        </div>
      </div>
    </div>
  )
}
