import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`shimmer rounded-lg bg-brand-wood/10 ${className}`} style={style} />
}

export function MetricSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-brand-wood/10">
      <Skeleton className="w-12 h-12 rounded-2xl mb-4" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-14 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-brand-wood/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4" style={{ width: `${40 + ((i * 17) % 40)}%` }} />
        </td>
      ))}
    </tr>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-brand-wood/10 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-20 rounded-xl" />
    </div>
  )
}
