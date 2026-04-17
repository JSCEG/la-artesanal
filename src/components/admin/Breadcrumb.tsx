import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface Props {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: Props) {
  const all = [{ label: 'Admin', to: '/admin' }, ...items]

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0">
      {all.map((item, i) => {
        const isLast = i === all.length - 1
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span className="text-gray-300 flex-shrink-0">/</span>}
            {!isLast && item.to ? (
              <Link
                to={item.to}
                className="text-gray-400 hover:text-brand-berry transition-colors truncate max-w-[120px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className={`truncate max-w-[160px] ${isLast ? 'text-brand-coffee font-semibold' : 'text-gray-400'}`}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
