import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { useToast } from '../../context/ToastContext'
import Breadcrumb, { type BreadcrumbItem } from './Breadcrumb'
import { getAlertasOperativas, type AlertasOperativas } from '../../services/dashboard'

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
  { to: '/admin/promociones', label: 'Promos',     icon: Icon.list,      accent: 'from-brand-coral to-brand-teal' },
  { to: '/admin/mapa',       label: 'Mapa',       icon: Icon.map,       accent: 'from-brand-teal to-brand-berry' },
]

interface AdminLayoutProps {
  breadcrumb?: BreadcrumbItem[]
}

export default function AdminLayout({ breadcrumb = [] }: AdminLayoutProps) {
  const { profile, signOut } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertas, setAlertas] = useState<AlertasOperativas | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const seenPedidoIds = useRef<Set<string> | null>(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Cargar alertas al montar + cada 45s; dispara toast si hay pedidos nuevos
  useEffect(() => {
    let cancel = false
    const load = async () => {
      try {
        const a = await getAlertasOperativas()
        if (cancel) return

        // Primera carga: inicializa set silenciosamente
        if (seenPedidoIds.current === null) {
          seenPedidoIds.current = new Set(a.pedidos.map(p => p.id))
        } else {
          // Cargas posteriores: ids nuevos → toast
          const nuevos = a.pedidos.filter(p => !seenPedidoIds.current!.has(p.id))
          for (const p of nuevos) {
            toast.info(`Nuevo pedido de ${p.cliente_nombre} — ${p.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })}`)
            seenPedidoIds.current.add(p.id)
          }
        }
        setAlertas(a)
      } catch { /* noop */ }
    }
    load()
    const id = setInterval(load, 45_000)
    return () => { cancel = true; clearInterval(id) }
  }, [toast])

  // Click fuera cierra dropdown
  useEffect(() => {
    if (!notifOpen) return
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notifOpen])

  const totalAlertas =
    (alertas?.stock.length ?? 0) +
    (alertas?.cxc.length ?? 0) +
    (alertas?.pedidos.length ?? 0)

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo header */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="La Artesanal"
            className="w-9 h-9 rounded-full border border-brand-wood/10" />
          <div>
            <p className="text-brand-wood font-display font-black text-base leading-none">La Artesanal</p>
            <p className="text-brand-wood-soft text-[9px] uppercase tracking-[0.2em] mt-1 font-bold">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-brand-berry/8 text-brand-berry'
                  : 'text-brand-wood/65 hover:bg-brand-cream/50 hover:text-brand-wood'
              }`
            }
          >
            {({ isActive }) => {
              const badgeCount =
                item.to === '/admin/entregas' ? (alertas?.enRuta ?? 0) :
                item.to === '/admin/pedidos'  ? (alertas?.pedidos.length ?? 0) :
                0
              return (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-brand-berry" />
                  )}
                  <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-brand-berry' : 'text-brand-wood/50 group-hover:text-brand-wood'
                  }`} />
                  <span className="tracking-tight flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className={`text-[10px] font-black px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                      item.to === '/admin/entregas'
                        ? 'bg-brand-coral/15 text-brand-coral'
                        : 'bg-brand-teal/15 text-brand-teal'
                    }`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </>
              )
            }}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + Salir */}
      <div className="px-3 py-3 border-t border-brand-wood/8">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-berry/10 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-berry text-xs font-black">
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-brand-wood text-sm font-bold truncate leading-tight">{profile?.full_name || 'Usuario'}</p>
            <p className="text-brand-wood-soft text-[9px] uppercase tracking-widest font-bold mt-0.5">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-brand-wood/65 hover:bg-brand-berry/8 hover:text-brand-berry transition-colors group"
        >
          <Icon.logout className="w-[18px] h-[18px] shrink-0 text-brand-wood/50 group-hover:text-brand-berry transition-colors" />
          <span className="tracking-tight">Cerrar sesión</span>
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
      <aside className="hidden md:flex w-60 flex-col flex-shrink-0 relative overflow-hidden bg-white border-r border-brand-wood/10">
        <SidebarContent />
      </aside>

      {/* Sidebar móvil */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-72 z-50 md:hidden flex flex-col overflow-hidden shadow-2xl bg-white border-r border-brand-wood/10">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header glass */}
        <header className="bg-white px-4 md:px-6 h-16 flex items-center gap-3 flex-shrink-0 border-b border-brand-wood/10">
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

          {/* Campana + dropdown alertas */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative w-10 h-10 rounded-xl bg-white border border-brand-wood/10 hover:border-brand-berry hover:text-brand-berry flex items-center justify-center text-brand-wood transition-all shadow-sm"
              aria-label="Notificaciones"
            >
              <Icon.bell className="w-5 h-5" />
              {totalAlertas > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-berry text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                  {totalAlertas > 9 ? '9+' : totalAlertas}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-brand-wood/10 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-wood/10 flex items-center justify-between">
                  <p className="font-display font-black text-brand-wood text-sm">Alertas</p>
                  <span className="text-[10px] uppercase tracking-widest text-brand-wood-soft font-bold">
                    {totalAlertas} pendiente{totalAlertas === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {totalAlertas === 0 && (
                    <div className="px-4 py-8 text-center">
                      <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center mx-auto mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <p className="text-sm font-bold text-brand-wood">Todo en orden</p>
                      <p className="text-xs text-brand-wood-soft font-medium">Sin alertas operativas.</p>
                    </div>
                  )}

                  {alertas && alertas.pedidos.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-brand-teal/5 border-b border-brand-teal/10 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-brand-teal font-black">Pedidos nuevos</span>
                        <Link to="/admin/pedidos" onClick={() => setNotifOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-teal hover:text-brand-berry">Ver</Link>
                      </div>
                      <ul>
                        {alertas.pedidos.slice(0, 4).map(p => {
                          const m = p.minutos_atras
                          const rel = m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m/60)} h` : `hace ${Math.floor(m/1440)} d`
                          return (
                            <li key={p.id} className="px-4 py-2.5 border-b border-brand-wood/5 last:border-0 flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-brand-wood truncate">{p.cliente_nombre}</p>
                                <p className="text-[10px] text-brand-wood-soft font-semibold truncate">
                                  {p.sucursal_nombre ?? 'Principal'} · {p.n_productos} prod · {rel}
                                </p>
                              </div>
                              <p className="font-display text-sm font-black text-brand-teal flex-shrink-0">
                                {p.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })}
                              </p>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {alertas && alertas.stock.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-brand-coral/5 border-b border-brand-coral/10 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-brand-coral font-black">Stock crítico</span>
                        <Link to="/admin/inventario" onClick={() => setNotifOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-coral hover:text-brand-berry">Ver</Link>
                      </div>
                      <ul>
                        {alertas.stock.slice(0, 4).map(i => (
                          <li key={i.id} className="px-4 py-2.5 border-b border-brand-wood/5 last:border-0 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-brand-wood truncate">{i.nombre}</p>
                              <p className="text-[10px] font-mono text-brand-wood-soft font-bold">
                                {i.stock_actual} / {i.stock_minimo} {i.unidad}
                              </p>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border-2 flex-shrink-0 ${
                              i.estado === 'agotado'
                                ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'
                                : 'bg-brand-coral/10 text-brand-coral border-brand-coral/30'
                            }`}>
                              {i.estado === 'agotado' ? 'AGOTADO' : 'BAJO'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {alertas && alertas.cxc.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-brand-berry/5 border-b border-brand-berry/10 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-brand-berry font-black">Cobranza vencida</span>
                        <Link to="/admin/cobros" onClick={() => setNotifOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-berry hover:text-brand-berry-soft">Ver</Link>
                      </div>
                      <ul>
                        {alertas.cxc.slice(0, 4).map(c => (
                          <li key={c.cliente_id} className="px-4 py-2.5 border-b border-brand-wood/5 last:border-0 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-brand-wood truncate">{c.nombre_comercial}</p>
                              <p className="text-[10px] text-brand-wood-soft font-semibold">{c.dias_max} días máx.</p>
                            </div>
                            <p className="font-display text-sm font-black text-brand-berry flex-shrink-0">
                              {c.saldo_vencido.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
