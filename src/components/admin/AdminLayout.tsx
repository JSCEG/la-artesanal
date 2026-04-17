import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import Breadcrumb, { type BreadcrumbItem } from './Breadcrumb'

const LOGO_URL = 'https://pub-74e211e7329944698d66a7be2d5a8eca.r2.dev/la-artesanal/img/logo.png'

type IconProps = { className?: string }
const Icon = {
  dashboard: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
  ),
  cone: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z"/><path d="m7 22 5-5 5 5"/></svg>
  ),
  store: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-2.48-1.7 2.5 2.5 0 0 1-5.04 0A2.7 2.7 0 0 1 10 12a2.7 2.7 0 0 1-2.48-1.7 2.5 2.5 0 0 1-5.04 0A2 2 0 0 1 2 10V7"/></svg>
  ),
  list: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
  ),
  truck: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  ),
  money: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  box: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
  ),
  map: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
  ),
  logout: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
  ),
  menu: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
  ),
  bell: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
  ),
}

const NAV_ITEMS = [
  { to: '/admin',            label: 'Dashboard',  icon: Icon.dashboard, end: true, accent: 'from-brand-berry to-brand-berry-soft' },
  { to: '/admin/catalogo',   label: 'Catálogo',   icon: Icon.cone,      accent: 'from-brand-teal to-brand-teal-soft' },
  { to: '/admin/clientes',   label: 'Clientes',   icon: Icon.store,     accent: 'from-brand-coral to-brand-berry-soft' },
  { to: '/admin/pedidos',    label: 'Pedidos',    icon: Icon.list,      accent: 'from-brand-berry to-brand-coral' },
  { to: '/admin/entregas',   label: 'Entregas',   icon: Icon.truck,     accent: 'from-brand-teal to-brand-wood-soft' },
  { to: '/admin/cobros',     label: 'Cobros',     icon: Icon.money,     accent: 'from-brand-wood-soft to-brand-coral' },
  { to: '/admin/inventario', label: 'Inventario', icon: Icon.box,       accent: 'from-brand-wood to-brand-wood-soft' },
  { to: '/admin/mapa',       label: 'Mapa',       icon: Icon.map,       accent: 'from-brand-teal to-brand-berry' },
]

interface AdminLayoutProps {
  breadcrumb?: BreadcrumbItem[]
}

export default function AdminLayout({ breadcrumb = [] }: AdminLayoutProps) {
  const { profile, signOut } = useSession()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full relative">
      {/* Patrón de puntos decorativo */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
           style={{
             backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
             backgroundSize: '14px 14px',
           }} />

      {/* Logo header */}
      <div className="px-5 py-5 border-b border-white/10 relative">
        <div className="flex items-center gap-3">
          <span className="logo-glass rounded-full p-1 bg-white/15 border-white/30">
            <img src={LOGO_URL} alt="La Artesanal"
              className="w-10 h-10 rounded-full border border-white/40 bg-white/90" />
          </span>
          <div>
            <p className="text-white font-display font-black text-base leading-none">La Artesanal</p>
            <p className="text-white/60 text-[10px] uppercase tracking-widest mt-1 font-bold">Panel interno</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto relative">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-white text-brand-wood shadow-[4px_4px_0_rgba(0,0,0,0.15)] -translate-y-0.5'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${item.accent} text-white shadow-md`
                    : 'bg-white/10 text-white/80 group-hover:bg-white/20'
                }`}>
                  <item.icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-berry" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + Salir */}
      <div className="px-4 py-4 border-t border-white/10 relative">
        <div className="flex items-center gap-3 mb-3 bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-berry to-brand-berry-soft flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-sm font-black">
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-bold truncate leading-tight">{profile?.full_name || 'Usuario'}</p>
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mt-0.5">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-brand-berry border-2 border-white/20 hover:border-brand-berry text-white text-sm font-bold py-2.5 rounded-xl transition-all group"
        >
          <Icon.logout className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden"
         style={{
           backgroundImage: 'radial-gradient(circle, rgba(177,48,107,0.08) 1.2px, transparent 1.2px)',
           backgroundSize: '22px 22px',
           backgroundColor: '#fdfbf7',
         }}>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 flex-col flex-shrink-0 relative overflow-hidden"
             style={{ background: 'linear-gradient(180deg, #5b3822 0%, #3a2416 100%)' }}>
        <SidebarContent />
      </aside>

      {/* Sidebar móvil */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-72 z-50 md:hidden flex flex-col overflow-hidden shadow-2xl"
                 style={{ background: 'linear-gradient(180deg, #5b3822 0%, #3a2416 100%)' }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header glass */}
        <header className="glass-panel px-4 md:px-6 h-16 flex items-center gap-3 flex-shrink-0 border-b border-brand-berry/10">
          {/* Hamburger móvil */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-10 h-10 rounded-xl bg-white border border-brand-wood/10 hover:border-brand-berry hover:text-brand-berry flex items-center justify-center text-brand-wood transition-all shadow-sm"
            aria-label="Abrir menú"
          >
            <Icon.menu className="w-5 h-5" />
          </button>

          <Breadcrumb items={breadcrumb} />

          <div className="flex-1" />

          {/* Badge rol */}
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest bg-gradient-to-r from-brand-berry to-brand-berry-soft text-white px-3 py-1.5 rounded-full font-black shadow-sm">
            {profile?.role}
          </span>

          {/* Campana */}
          <button className="relative w-10 h-10 rounded-xl bg-white border border-brand-wood/10 hover:border-brand-berry hover:text-brand-berry flex items-center justify-center text-brand-wood transition-all shadow-sm"
                  aria-label="Notificaciones">
            <Icon.bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-coral border-2 border-white" />
          </button>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
