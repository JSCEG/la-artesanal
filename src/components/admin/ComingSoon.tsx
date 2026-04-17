import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type Tone = 'berry' | 'teal' | 'coral' | 'wood'

interface Feature {
  label: string
  hint?: string
  done?: boolean
}

interface Props {
  title: string
  eyebrow?: string
  description: string
  features: Feature[]
  icon: ReactNode
  tone?: Tone
  eta?: string
}

const TONES: Record<Tone, { hero: string; shadow: string; chip: string; iconBg: string }> = {
  berry: {
    hero:   'from-brand-berry to-brand-berry-soft',
    shadow: '0 12px 40px rgba(177,48,107,0.25)',
    chip:   'bg-brand-berry/10 text-brand-berry border-brand-berry/30',
    iconBg: 'from-brand-berry to-brand-berry-soft',
  },
  teal: {
    hero:   'from-brand-teal to-brand-teal-soft',
    shadow: '0 12px 40px rgba(45,102,128,0.25)',
    chip:   'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
    iconBg: 'from-brand-teal to-brand-teal-soft',
  },
  coral: {
    hero:   'from-brand-coral to-brand-berry-soft',
    shadow: '0 12px 40px rgba(235,121,111,0.25)',
    chip:   'bg-brand-coral/15 text-brand-coral border-brand-coral/30',
    iconBg: 'from-brand-coral to-brand-berry-soft',
  },
  wood: {
    hero:   'from-brand-wood to-brand-wood-soft',
    shadow: '0 12px 40px rgba(91,56,34,0.25)',
    chip:   'bg-brand-wood/10 text-brand-wood border-brand-wood/30',
    iconBg: 'from-brand-wood to-brand-wood-soft',
  },
}

export default function ComingSoon({
  title,
  eyebrow,
  description,
  features,
  icon,
  tone = 'berry',
  eta,
}: Props) {
  const t = TONES[tone]
  const done = features.filter(f => f.done).length

  return (
    <div className="space-y-5 md:space-y-6">

      {/* Hero */}
      <div
        className={`relative bg-gradient-to-br ${t.hero} rounded-3xl p-6 md:p-10 text-white overflow-hidden`}
        style={{ boxShadow: t.shadow }}
      >
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{
               backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
               backgroundSize: '18px 18px',
             }} />

        {/* Chip "En desarrollo" */}
        <div className="relative flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            En desarrollo
          </span>
          {eyebrow && (
            <span className="text-white/70 text-[10px] uppercase tracking-widest font-bold">
              {eyebrow}
            </span>
          )}
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          {/* Ícono grande */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white">{icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl md:text-4xl font-black leading-tight mb-2">
              {title}
            </h1>
            <p className="text-white/90 text-sm md:text-base font-medium max-w-xl">
              {description}
            </p>
            {eta && (
              <p className="text-white/80 text-xs md:text-sm font-bold mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {eta}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Features roadmap */}
      <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-[0_4px_24px_rgba(177,48,107,0.06)] p-5 md:p-8">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h2 className="font-display text-lg md:text-xl font-black text-brand-wood">Qué vendrá</h2>
            <p className="text-xs md:text-sm text-brand-wood-soft font-medium mt-0.5">
              Lo que este módulo te permitirá hacer
            </p>
          </div>
          <span className={`text-[10px] uppercase tracking-widest border-2 px-3 py-1.5 rounded-full font-black ${t.chip}`}>
            {done} / {features.length}
          </span>
        </div>

        <ul className="space-y-2.5">
          {features.map((f, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                f.done
                  ? 'bg-brand-teal/5 border-brand-teal/30'
                  : 'bg-brand-cream/30 border-brand-wood/10'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                f.done
                  ? 'bg-brand-teal text-white'
                  : 'bg-white border-2 border-brand-wood/20 text-brand-wood-soft'
              }`}>
                {f.done ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold leading-snug ${f.done ? 'text-brand-teal' : 'text-brand-wood'}`}>
                  {f.label}
                </p>
                {f.hint && (
                  <p className="text-xs text-brand-wood-soft mt-0.5 leading-relaxed">{f.hint}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA volver */}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin" className="btn-secondary text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Volver al Dashboard
        </Link>
        <Link to="/admin/pedidos" className="btn-primary text-sm">
          Ir a Pedidos
        </Link>
      </div>
    </div>
  )
}
