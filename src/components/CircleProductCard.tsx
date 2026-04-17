import { formatCurrency } from '../utils/format'
import type { Producto } from '../hooks/useCatalogo'
import type { Profile } from '../types'

export interface CategoryTheme {
  bg: string
  accent: string
  shadow: string
}

interface Props {
  producto: Producto
  profile: Profile | null
  theme: CategoryTheme
  onPedir: (p: Producto) => void
}

const FALLBACK = 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=300&h=300&fit=crop&auto=format'

export default function CircleProductCard({ producto, profile, theme, onPedir }: Props) {
  const esMayorista = profile?.commercial_profile === 'mayorista'
  const precio = esMayorista ? producto.precio_mayorista : producto.precio_minorista
  const esPublico = !profile
  const imgSrc = producto.photo_url || FALLBACK

  return (
    <article className="snap-center shrink-0 w-52 md:w-56 flex flex-col items-center cursor-pointer group">

      {/* Círculo flotante con imagen */}
      <div className="relative z-10">
        <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-white flex items-center justify-center
                        overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.12)] border-4 border-white
                        group-hover:-translate-y-2 transition-transform duration-300">
          <img src={imgSrc} alt={producto.name} loading="lazy"
               className="w-full h-full object-cover pointer-events-none" />
        </div>

        {/* Badge de precio flotante (o lock si es público) */}
        {!esPublico && precio ? (
          <div className="absolute -top-1 -right-1 bg-white rounded-full px-3 py-1.5 shadow-lg border-2"
               style={{ borderColor: theme.accent }}>
            <span className="font-display font-black text-sm" style={{ color: theme.accent }}>
              {formatCurrency(precio)}
            </span>
          </div>
        ) : esPublico ? (
          <div className="absolute -top-1 -right-1 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2"
               style={{ borderColor: theme.accent }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        ) : null}
      </div>

      {/* Card body pastel */}
      <div className="w-full rounded-3xl -mt-14 pt-16 pb-6 px-5 text-center flex flex-col items-center gap-2.5
                      transition-all duration-300 group-hover:-translate-y-1"
           style={{ background: theme.bg, boxShadow: `0 8px 24px ${theme.shadow}` }}>

        <h4 className="font-display text-base md:text-lg font-black uppercase tracking-wide leading-tight"
            style={{ color: theme.accent }}>
          {producto.name}
        </h4>

        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full opacity-40" style={{ background: theme.accent }} />
          <span className="w-1.5 h-1.5 rounded-full opacity-70" style={{ background: theme.accent }} />
          <span className="w-1.5 h-1.5 rounded-full opacity-40" style={{ background: theme.accent }} />
        </div>

        <p className="text-gray-500 text-xs font-medium leading-relaxed line-clamp-3 min-h-[2.5rem]">
          {producto.description || producto.unit}
        </p>

        <button
          type="button"
          onClick={e => { e.stopPropagation(); onPedir(producto) }}
          className="mt-1 px-4 h-10 bg-white rounded-full flex items-center justify-center gap-2
                     shadow-md hover:scale-105 active:scale-95 transition-transform font-bold text-xs uppercase tracking-wider"
          style={{ color: theme.accent }}
          aria-label={`Pedir ${producto.name}`}
        >
          Pedir
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </article>
  )
}
