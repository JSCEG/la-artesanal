import CircleProductCard, { type CategoryTheme } from './CircleProductCard'
import type { Producto } from '../hooks/useCatalogo'
import type { Profile } from '../types'

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  Paletas: { bg: '#fce4ef', accent: '#b1306b', shadow: 'rgba(177,48,107,0.15)' },
  Nieves:  { bg: '#d6edf5', accent: '#2d6680', shadow: 'rgba(45,102,128,0.15)' },
  Litros:  { bg: '#fde8cc', accent: '#c07a3e', shadow: 'rgba(192,122,62,0.15)' },
  Cafe:    { bg: '#ecdff5', accent: '#7c4fa0', shadow: 'rgba(124,79,160,0.15)' },
}

const DEFAULT_THEME: CategoryTheme = CATEGORY_THEMES.Paletas

interface Props {
  categoria: string
  productos: Producto[]
  profile: Profile | null
  onPedir: (p: Producto) => void
}

export default function CatalogRow({ categoria, productos, profile, onPedir }: Props) {
  if (productos.length === 0) return null
  const theme = CATEGORY_THEMES[categoria] ?? DEFAULT_THEME

  return (
    <div className="flex flex-col gap-4">

      {/* Encabezado de fila */}
      <div className="flex items-center gap-4 px-4 md:px-0">
        <h3 className="font-display text-2xl md:text-3xl font-black" style={{ color: theme.accent }}>
          {categoria}
        </h3>
        <div className="h-1 flex-1 rounded-full" style={{ background: `${theme.accent}1a` }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
          {productos.length}
        </span>
      </div>

      {/* Track horizontal con scroll-snap */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-6 pt-3 px-4 md:px-0 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {productos.map(p => (
          <CircleProductCard
            key={p.id}
            producto={p}
            profile={profile}
            theme={theme}
            onPedir={onPedir}
          />
        ))}
      </div>
    </div>
  )
}
