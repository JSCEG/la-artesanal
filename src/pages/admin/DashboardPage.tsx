import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from '../../hooks/useSession'
import { MetricSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'

interface Metric {
  label: string
  value: string
  hint: string
  gradient: string
  shadow: string
  icon: ReactNode
}

const METRICS: Metric[] = [
  {
    label: 'Pedidos hoy',
    value: '—',
    hint: 'En curso y nuevos',
    gradient: 'from-brand-berry to-brand-berry-soft',
    shadow: 'rgba(177,48,107,0.25)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
    ),
  },
  {
    label: 'Ingresos hoy',
    value: '—',
    hint: 'Minorista + mayorista',
    gradient: 'from-brand-teal to-brand-teal-soft',
    shadow: 'rgba(45,102,128,0.25)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    ),
  },
  {
    label: 'Clientes activos',
    value: '—',
    hint: 'Con al menos 1 pedido',
    gradient: 'from-brand-coral to-brand-berry-soft',
    shadow: 'rgba(235,121,111,0.25)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
  {
    label: 'Stock crítico',
    value: '—',
    hint: 'Productos por reponer',
    gradient: 'from-brand-wood to-brand-wood-soft',
    shadow: 'rgba(91,56,34,0.25)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
    ),
  },
]

const MODULOS = [
  { nombre: 'Catálogo', estado: 'listo' },
  { nombre: 'Clientes + Sucursales', estado: 'listo' },
  { nombre: 'Mapa Leaflet', estado: 'listo' },
  { nombre: 'Pedidos', estado: 'pendiente' },
  { nombre: 'Entregas', estado: 'pendiente' },
  { nombre: 'Cobros', estado: 'pendiente' },
  { nombre: 'Inventario', estado: 'pendiente' },
  { nombre: 'Cuentas por cobrar', estado: 'pendiente' },
]

export default function DashboardPage() {
  const { profile } = useSession()
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Hero saludo */}
      <div className="relative bg-gradient-to-br from-brand-berry to-brand-berry-soft rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-[0_12px_40px_rgba(177,48,107,0.25)]">
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '18px 18px',
          }} />
        <div className="relative">
          <p className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2">{saludo}</p>
          <h1 className="font-display text-2xl md:text-4xl font-black leading-tight mb-2">
            {profile?.full_name?.split(' ')[0] || 'Equipo'} 👋
          </h1>
          <p className="text-white/90 text-sm md:text-base font-medium max-w-xl">
            Resumen operativo del día — pedidos, ingresos y el estado de la operación.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
          : METRICS.map(m => (
            <div
              key={m.label}
              className="bg-white rounded-2xl p-5 border border-brand-wood/10 hover:-translate-y-1 hover:shadow-lg transition-all group cursor-pointer"
              style={{ boxShadow: `0 4px 20px ${m.shadow}` }}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${m.gradient} text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                {m.icon}
              </div>
              <p className="text-[11px] uppercase tracking-widest text-brand-wood/60 font-bold mb-1">{m.label}</p>
              <p className="font-display text-3xl font-black text-brand-wood leading-none">{m.value}</p>
              <p className="text-xs text-brand-wood-soft font-medium mt-2">{m.hint}</p>
            </div>
          ))
        }
      </div>

      {/* Actividad reciente (empty state mientras no hay datos) */}
      <EmptyState
        tone="berry"
        icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
        title="Aún no hay pedidos hoy"
        description="Cuando entre el primer pedido, aparecerá aquí con su estado y total. Mientras tanto, podés dar de alta productos o clientes."
        action={
          <>
            <a href="/admin/catalogo" className="btn-primary text-sm">Ir a Catálogo</a>
            <a href="/admin/clientes" className="btn-secondary text-sm">Ver clientes</a>
          </>
        }
      />

      {/* Módulos */}
      <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-[0_4px_24px_rgba(177,48,107,0.06)] p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Módulos</h2>
            <p className="text-sm text-brand-wood-soft font-medium mt-1">Avance de FASE 1C — Panel Admin</p>
          </div>
          <span className="text-[10px] uppercase tracking-widest bg-brand-cream border-2 border-brand-wood/15 text-brand-wood px-3 py-1.5 rounded-full font-black">
            {MODULOS.filter(m => m.estado === 'listo').length} / {MODULOS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODULOS.map(m => {
            const listo = m.estado === 'listo'
            return (
              <div
                key={m.nombre}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${listo
                    ? 'bg-brand-teal/5 border-brand-teal/30 text-brand-teal'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${listo ? 'bg-brand-teal text-white' : 'bg-gray-200'
                  }`}>
                  {listo ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : null}
                </span>
                <span className="text-sm font-bold">{m.nombre}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
