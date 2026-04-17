import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  tone?: 'berry' | 'teal' | 'coral' | 'wood'
}

const TONES = {
  berry: { bg: 'from-brand-berry/10 to-brand-berry-soft/10', ring: 'border-brand-berry/20', icon: 'text-brand-berry' },
  teal:  { bg: 'from-brand-teal/10 to-brand-teal-soft/10',   ring: 'border-brand-teal/20',  icon: 'text-brand-teal' },
  coral: { bg: 'from-brand-coral/15 to-brand-berry-soft/10', ring: 'border-brand-coral/20', icon: 'text-brand-coral' },
  wood:  { bg: 'from-brand-wood/5 to-brand-wood-soft/10',    ring: 'border-brand-wood/20',  icon: 'text-brand-wood' },
}

const DEFAULT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
)

export default function EmptyState({ icon, title, description, action, tone = 'berry' }: Props) {
  const t = TONES[tone]
  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 border-dashed ${t.ring} bg-gradient-to-br ${t.bg} p-8 md:p-12 text-center`}>
      {/* Patrón decorativo */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
           style={{
             backgroundImage: 'radial-gradient(circle, rgba(91,56,34,0.12) 1px, transparent 1px)',
             backgroundSize: '16px 16px',
           }} />

      <div className="relative flex flex-col items-center">
        <div className={`w-20 h-20 rounded-full bg-white shadow-md border-2 border-white flex items-center justify-center mb-5 ${t.icon}`}>
          {icon || DEFAULT_ICON}
        </div>
        <h3 className="font-display text-xl md:text-2xl font-black text-brand-wood mb-2">{title}</h3>
        {description && (
          <p className="text-sm md:text-base text-brand-wood-soft max-w-md mb-6 leading-relaxed">{description}</p>
        )}
        {action && <div className="flex flex-wrap gap-3 justify-center">{action}</div>}
      </div>
    </div>
  )
}
