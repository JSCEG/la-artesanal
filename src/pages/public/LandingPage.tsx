import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import CatalogRow from '../../components/CatalogRow'
import Reveal from '../../components/Reveal'
import { useCatalogo, CATEGORIAS } from '../../hooks/useCatalogo'
import { useSession } from '../../hooks/useSession'
import { useToast } from '../../context/ToastContext'
import type { Producto } from '../../hooks/useCatalogo'

const LOGO_URL  = 'https://pub-74e211e7329944698d66a7be2d5a8eca.r2.dev/la-artesanal/img/logo.png'
const ARO_URL   = 'https://cdn.sassoapps.com/la-artesanal/img/aro.png'
const PAJARO_L  = 'https://pub-74e211e7329944698d66a7be2d5a8eca.r2.dev/la-artesanal/img/pajaritol.png'
const PAJARO_R  = 'https://pub-74e211e7329944698d66a7be2d5a8eca.r2.dev/la-artesanal/img/pajarito-r.png'
const VIDEO_URL = 'https://cdn.sassoapps.com/la-artesanal/video/video.mp4'

const GALERIA = [
  'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=300&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=300&h=400&fit=crop&auto=format',
]

const NOVEDADES = [
  {
    titulo: 'La Fresa Perfecta',
    desc: 'Nueva cosecha de fresas michoacanas molidas artesanalmente para nuestro clásico sabor rojo.',
    badge: 'Temporada',
    badgeColor: 'bg-brand-berry',
    shadow: 'shadow-[0_4px_32px_rgba(177,48,107,0.12)] hover:shadow-[0_8px_40px_rgba(177,48,107,0.22)]',
    img: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&h=400&fit=crop&auto=format',
    tiempo: 'Hace 2 días',
    ribbon: 'NUEVO',
  },
  {
    titulo: 'Mango con toque único',
    desc: 'El rey del calor aterrizó; un estallido de color amarillo vibrante en cada bocado.',
    badge: 'Receta',
    badgeColor: 'bg-brand-teal',
    shadow: 'shadow-[0_4px_32px_rgba(45,102,128,0.12)] hover:shadow-[0_8px_40px_rgba(45,102,128,0.22)]',
    img: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&h=400&fit=crop&auto=format',
    tiempo: 'Hace 1 semana',
    ribbon: 'POPULAR',
  },
  {
    titulo: 'Llevamos el carrito',
    desc: 'Estuvimos refrescando el verano con nuestro estante minimalista corporativo. ¡Pídelo!',
    badge: 'Noticia',
    badgeColor: 'bg-brand-coral',
    shadow: 'shadow-[0_4px_32px_rgba(235,121,111,0.12)] hover:shadow-[0_8px_40px_rgba(235,121,111,0.22)]',
    img: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&h=400&fit=crop&auto=format',
    tiempo: 'Hace 1 mes',
    ribbon: null as string | null,
  },
]

const HORARIOS = [
  { dia: 'Lunes a Viernes', horas: '10:00 – 20:00' },
  { dia: 'Sábado',          horas: '09:00 – 21:00' },
  { dia: 'Domingo',         horas: '10:00 – 19:00' },
]

export default function LandingPage() {
  const { profile, session } = useSession()
  const { productos, loading } = useCatalogo(profile)
  const [categoria, setCategoria] = useState('Todos')
  const [busqueda, setBusqueda]   = useState('')
  const [modalLogin, setModalLogin] = useState(false)
  const [glow, setGlow] = useState<CSSProperties>({})
  const navigate = useNavigate()
  const toast = useToast()

  const filtrados = productos.filter(p => {
    const matchCat = categoria === 'Todos' || p.category === categoria
    const matchBus = p.name.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBus
  })

  function handlePedir(producto: Producto) {
    if (!session) setModalLogin(true)
    else toast.success(`"${producto.name}" agregado al pedido`)
  }

  function handleHeroMove(e: ReactMouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setGlow({
      ['--mx' as any]: `${e.clientX - rect.left}px`,
      ['--my' as any]: `${e.clientY - rect.top}px`,
      ['--glow' as any]: 1,
    })
  }
  function handleHeroLeave() {
    setGlow(g => ({ ...g, ['--glow' as any]: 0 }))
  }

  const whatsappLink = 'https://wa.me/527711939522?text=Hola%2C%20quiero%20cotizar%20un%20pedido.'

  return (
    <div className="relative overflow-x-hidden w-full pb-24 md:pb-16">
      <Navbar />

      <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 pt-8 space-y-10 md:space-y-16">
        <main className="space-y-16 lg:space-y-24">

          {/* ── HERO ── */}
          <section
            id="inicio"
            onMouseMove={handleHeroMove}
            onMouseLeave={handleHeroLeave}
            style={glow}
            className="relative grain cursor-glow flex flex-col items-center text-center rounded-3xl"
          >
            {/* Logo móvil con aro de flores */}
            <div className="relative block md:hidden mb-6 w-52 h-52 mx-auto flex items-center justify-center">
              <img src={ARO_URL} alt="" aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none drop-shadow-sm" />
              <img src={LOGO_URL} alt="La Artesanal"
                className="relative z-10 w-32 h-32 rounded-full object-cover bg-white shadow-md border-2 border-white" />
            </div>

            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-berry text-white text-xs font-bold uppercase tracking-widest mb-6 shadow-[3px_3px_0_rgba(177,48,107,0.3)] border-2 border-brand-berry-soft">
              ¡Aquí sí es nieve artesanal!
            </span>

            <div className="relative w-full max-w-3xl">
              <img src={ARO_URL} alt="" aria-hidden="true"
                className="hidden md:block absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 object-contain opacity-20 pointer-events-none select-none -z-10" />
              <img src={PAJARO_L} alt="" aria-hidden="true"
                className="absolute -top-6 md:-top-12 -left-4 md:-left-12 w-16 md:w-24 drop-shadow-[0_0_10px_rgba(255,255,255,1)] z-20 -rotate-12 hover:-translate-y-2 hover:rotate-0 transition-transform cursor-pointer" />
              <img src={PAJARO_R} alt="" aria-hidden="true"
                className="absolute -top-8 md:-top-10 -right-2 md:-right-4 w-16 md:w-24 drop-shadow-[0_0_10px_rgba(255,255,255,1)] z-20 rotate-12 hover:-translate-y-2 hover:rotate-0 transition-transform cursor-pointer" />

              <h1 className="relative z-10 font-display text-5xl md:text-8xl font-black text-brand-wood leading-none mb-6">
                Hecha a mano,<br />
                <span className="text-brand-berry italic drop-shadow-md">como debe ser.</span>
              </h1>
            </div>

            <p className="text-brand-wood-soft text-lg md:text-2xl mb-8 leading-relaxed max-w-2xl font-medium">
              Refrescantes paletas y nieves creadas con recetas tradicionales.
              En Huasca de Ocampo y para eventos en toda la región.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <a href="#catalogo" className="btn-primary text-center">Explorar Catálogo</a>
              <a href="#contacto" className="btn-secondary text-center">Cotizar para evento</a>
            </div>

            {/* Galería hero: paletas flotantes */}
            <div className="w-full max-w-4xl relative flex items-end justify-center gap-2 sm:gap-3 md:gap-5 h-56 md:h-72 select-none pointer-events-none overflow-hidden px-1">
              <div className="shrink-0 w-28 md:w-36 h-44 md:h-56 rounded-2xl overflow-hidden shadow-xl -rotate-6 translate-y-4 border-2 border-white/60">
                <img src={GALERIA[0]} alt="Paleta" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block shrink-0 w-28 md:w-36 h-48 md:h-64 rounded-2xl overflow-hidden shadow-xl rotate-2 translate-y-2 border-2 border-white/60">
                <img src={GALERIA[1]} alt="Helado" className="w-full h-full object-cover" />
              </div>
              <div className="shrink-0 w-36 md:w-44 h-52 md:h-72 rounded-2xl overflow-hidden shadow-2xl z-10 border-4 border-white/80">
                <img src={GALERIA[2]} alt="Paleta estrella" className="w-full h-full object-cover" />
              </div>
              <div className="shrink-0 w-28 md:w-36 h-48 md:h-64 rounded-2xl overflow-hidden shadow-xl -rotate-2 translate-y-2 border-2 border-white/60">
                <img src={GALERIA[3]} alt="Nieve" className="w-full h-full object-cover" />
              </div>
              <div className="shrink-0 w-28 md:w-36 h-44 md:h-56 rounded-2xl overflow-hidden shadow-xl rotate-6 translate-y-4 border-2 border-white/60 hidden sm:block">
                <img src={GALERIA[4]} alt="Paleta tropical" className="w-full h-full object-cover" />
              </div>
            </div>
          </section>

          {/* ── VIDEO PROMO ── */}
          <section id="promo-video" className="bg-white relative group w-full overflow-hidden flex justify-center">
            <video
              src={VIDEO_URL}
              className="w-full h-auto max-h-[80vh] object-contain opacity-95 group-hover:opacity-100 transition-opacity duration-300"
              autoPlay loop muted playsInline
            />
          </section>

          {/* ── CATÁLOGO ── */}
          <section id="catalogo" className="scroll-mt-24 relative py-12">
            <div className="absolute inset-y-0 -z-10"
                 style={{ left: '50%', transform: 'translateX(-50%)', width: '100vw', background: '#FFF5F7' }} />

            <Reveal className="flex flex-col items-center mb-10 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-black text-black">Catálogo</h2>
              <div className="w-24 h-2 bg-brand-berry mt-4 rounded-full" />
              {profile?.commercial_profile === 'mayorista' && (
                <span className="mt-4 inline-block bg-brand-teal/10 text-brand-teal text-xs font-bold px-3 py-1 rounded-full">
                  Viendo precios mayorista
                </span>
              )}
            </Reveal>

            {/* Buscador a nivel galería */}
            <div className="max-w-md mx-auto mb-6 relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="search"
                placeholder="Buscar sabor, paleta, nieve..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-brand-wood/15 bg-white focus:outline-none focus:border-brand-berry focus:shadow-[0_4px_14px_rgba(177,48,107,0.15)] transition-all text-sm font-medium shadow-sm"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors">
                  ✕
                </button>
              )}
            </div>

            {/* Chips categoría: scroll horizontal móvil, wrap desktop */}
            <div className="flex gap-2 md:gap-3 mb-8 overflow-x-auto md:overflow-visible md:flex-wrap md:justify-center scrollbar-hide px-4 md:px-0 -mx-4 md:mx-0">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                    categoria === cat
                      ? 'bg-brand-berry text-white shadow-[0_4px_14px_rgba(177,48,107,0.35)] scale-105'
                      : 'bg-white border-2 border-brand-wood/15 text-brand-wood hover:border-brand-berry hover:text-brand-berry shadow-sm'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <p className="text-center text-gray-500 text-sm font-medium mb-6">{filtrados.length} productos</p>

            {loading ? (
              <div className="flex flex-col gap-12">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex gap-5 overflow-hidden px-4 md:px-0">
                    {[...Array(4)].map((__, j) => (
                      <div key={j} className="shrink-0 w-52 md:w-56">
                        <div className="w-32 h-32 md:w-36 md:h-36 mx-auto rounded-full bg-gray-200 animate-pulse" />
                        <div className="h-40 -mt-14 rounded-3xl bg-gray-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-12 -mx-4 md:mx-0">
                {(categoria === 'Todos'
                  ? CATEGORIAS.filter(c => c !== 'Todos')
                  : [categoria]
                ).map(cat => (
                  <CatalogRow
                    key={cat}
                    categoria={cat}
                    productos={filtrados.filter(p => p.category === cat)}
                    profile={profile}
                    onPedir={handlePedir}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── NOVEDADES ── */}
          <section id="novedades" className="scroll-mt-24 relative py-4">
            <div className="absolute bottom-0 h-[52%] -z-10 bg-gradient-to-r from-brand-berry/15 via-brand-berry/10 to-brand-berry-soft/15"
                 style={{ left: '50%', transform: 'translateX(-50%)', width: '100vw' }} />

            <Reveal className="flex flex-col items-center mb-12 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900">Novedades</h2>
              <div className="w-24 h-2 bg-brand-berry mt-4 rounded-full" />
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {NOVEDADES.map((n, i) => (
                <Reveal as="article" key={n.titulo} delay={i * 120}
                  className={`relative bg-white rounded-3xl ${n.shadow} hover:-translate-y-2 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden`}>
                  {n.ribbon && (
                    <div className="absolute top-4 -right-10 z-10 rotate-45 bg-gradient-to-r from-brand-berry to-brand-coral text-white text-[10px] font-black uppercase tracking-widest px-12 py-1 shadow-md">
                      {n.ribbon}
                    </div>
                  )}
                  <div className="relative w-full h-56 overflow-hidden">
                    <img src={n.img} alt={n.titulo} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest text-white ${n.badgeColor} px-3 py-1 rounded-full w-fit mb-4`}>
                      {n.badge}
                    </span>
                    <h3 className="font-display text-xl font-black text-gray-900 mb-2 leading-tight">{n.titulo}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{n.desc}</p>
                    <hr className="border-gray-100 mb-4" />
                    <span className="text-gray-400 font-bold text-xs mt-auto">{n.tiempo}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── CONTACTO ── */}
          <Reveal as="section" id="contacto" y={40} className="scroll-mt-24 bg-white text-gray-900 rounded-3xl p-8 md:p-12 shadow-[6px_6px_0_rgba(177,48,107,0.15)] border border-brand-berry/10 relative">
            <div className="md:grid md:grid-cols-2 gap-12 items-start">

              <div>
                <p className="text-brand-berry font-bold uppercase tracking-widest text-xs mb-3 border-2 border-brand-berry/30 inline-block px-3 py-1 bg-brand-berry/5 rounded-full">
                  Hablemos
                </p>
                <h2 className="font-display text-3xl md:text-5xl font-black mb-6 text-gray-900">Contáctanos</h2>
                <p className="text-gray-500 mb-8 max-w-md font-medium">
                  ¿Buscas distribución, abrir un punto de venta o cotizar para un evento? Estamos en Huasca de Ocampo.
                </p>

                <div className="space-y-4 font-bold text-gray-800 border-l-4 border-brand-berry pl-4 mb-8">
                  <p className="font-display text-2xl">La Artesanal</p>
                  <p className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>+52 771 193 9522</span>
                  </p>
                  <p className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <span>hola@laartesanal.mx</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-black shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span className="max-w-[250px]">Huasca de Ocampo, La Loma, enfrente del OXXO.</span>
                  </p>
                </div>

                {/* Horarios */}
                <div className="mb-8 mt-6">
                  <p className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-gray-500 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-berry" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Horarios de Atención
                  </p>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 divide-y divide-gray-100 text-gray-800 shadow-sm">
                    {HORARIOS.map(h => (
                      <div key={h.dia} className="flex justify-between py-2 text-sm font-semibold">
                        <span>{h.dia}</span>
                        <span className="text-brand-berry">{h.horas}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <a href={whatsappLink} target="_blank" rel="noreferrer"
                  className="px-6 py-3 rounded-xl font-bold text-white bg-brand-berry border-2 border-brand-berry hover:bg-[#25D366] hover:border-[#25D366] hover:shadow-[4px_4px_0_rgba(0,0,0,0.12)] transition-all flex items-center justify-center gap-2 w-fit">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  Escribir por WhatsApp
                </a>
              </div>

              {/* Mapa simple (iframe OSM embed de Huasca de Ocampo) */}
              <div className="mt-8 md:mt-0 rounded-2xl overflow-hidden border border-gray-200 shadow-md h-80 md:h-full min-h-[320px] isolate">
                <iframe
                  title="Mapa Huasca de Ocampo"
                  className="w-full h-full"
                  loading="lazy"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-98.585%2C20.195%2C-98.555%2C20.215&layer=mapnik&marker=20.205%2C-98.570"
                />
              </div>
            </div>
          </Reveal>

          {/* ── FOOTER ── */}
          <footer className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 pb-4 border-t-2 border-brand-berry/30">
            <p className="text-brand-wood-soft font-bold text-sm">© 2026 La Artesanal. Hecho a mano.</p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full border-2 border-brand-berry/40 flex items-center justify-center text-brand-berry hover:bg-brand-berry hover:text-white hover:border-brand-berry hover:-translate-y-1 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full border-2 border-brand-berry/40 flex items-center justify-center text-brand-berry hover:bg-brand-berry hover:text-white hover:border-brand-berry hover:-translate-y-1 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] md:hidden w-[calc(100%-1rem)] max-w-md mobile-nav-wrap">
        <div className="mobile-nav-shell rounded-3xl px-2 py-2 flex items-center gap-1">
          <a href="#inicio" className="mobile-nav-item">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-berry" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span className="text-[10px] font-black tracking-wide text-brand-wood/80">Inicio</span>
          </a>
          <a href="#catalogo" className="mobile-nav-item">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z"/><path d="m7 22 5-5 5 5"/></svg>
            </span>
            <span className="text-[10px] font-black tracking-wide text-brand-wood/80">Catálogo</span>
          </a>
          <a href="#novedades" className="mobile-nav-item">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-berry-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>
            </span>
            <span className="text-[10px] font-black tracking-wide text-brand-wood/80">Novedades</span>
          </a>
          <button type="button" onClick={() => session ? navigate('/cuenta') : navigate('/login')} className="mobile-nav-item">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.66a8 8 0 0 1 10 0"/></svg>
            </span>
            <span className="text-[10px] font-black tracking-wide text-brand-wood/80">{session ? 'Cuenta' : 'Entrar'}</span>
          </button>
        </div>
      </nav>

      {/* Modal login/registro */}
      {modalLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-[8px_8px_0_rgba(177,48,107,0.2)] border-2 border-brand-berry/20">
            <div className="text-4xl mb-4">🍦</div>
            <h3 className="font-display text-2xl font-black text-brand-wood mb-2">Regístrate para pedir</h3>
            <p className="text-sm text-gray-500 mb-6">Crea tu cuenta gratis y haz tu pedido en segundos.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setModalLogin(false); navigate('/registro') }} className="btn-primary w-full">Crear cuenta</button>
              <button onClick={() => { setModalLogin(false); navigate('/login') }} className="btn-secondary w-full">Ya tengo cuenta</button>
              <button onClick={() => setModalLogin(false)} className="text-sm text-gray-400 hover:text-gray-600 mt-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
