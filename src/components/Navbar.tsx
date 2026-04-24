import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useCart } from '../context/CartContext'

const LOGO_URL = 'https://pub-74e211e7329944698d66a7be2d5a8eca.r2.dev/la-artesanal/img/logo.png'

export default function Navbar() {
  const { session, profile, signOut } = useSession()
  const { count } = useCart()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isInternal = profile?.role === 'admin' || profile?.role === 'operador'

  return (
    <header className="sticky top-0 z-40 w-full glass-panel transition-all">
      <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-3 md:py-2 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0 group">
          <span className="logo-glass rounded-full p-1 md:p-1.5">
            <img src={LOGO_URL} alt="La Artesanal"
              className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/60 bg-white/80 group-hover:scale-105 transition-transform shadow-sm" />
          </span>
        </Link>

        {/* Nav links desktop */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
          <a href="#inicio"    className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-brand-berry/10 hover:text-brand-berry transition-colors text-sm">Inicio</a>
          <a href="#catalogo"  className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-brand-berry/10 hover:text-brand-berry transition-colors text-sm">Catálogo</a>
          <a href="#novedades" className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-brand-berry/10 hover:text-brand-berry transition-colors text-sm">Novedades</a>
          <a href="#contacto"  className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-brand-berry/10 hover:text-brand-berry transition-colors text-sm">Contacto</a>
        </nav>

        {/* Acciones auth */}
        <div className="flex gap-2 md:gap-3 shrink-0 items-center">
          <Link to="/tienda" className="relative px-3 py-2 rounded-xl text-gray-600 font-semibold hover:bg-brand-berry/10 hover:text-brand-berry transition-colors text-sm">
            🛒 <span className="hidden md:inline">Tienda</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-berry text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">{count}</span>
            )}
          </Link>
          {session ? (
            <>
              {isInternal ? (
                <Link to="/admin" className="btn-primary !py-2 !px-4 md:!px-5 text-xs md:text-sm">Admin</Link>
              ) : (
                <Link to="/cuenta" className="btn-secondary !py-2 !px-4 md:!px-5 text-xs md:text-sm">Mi cuenta</Link>
              )}
              <button onClick={handleSignOut} className="hidden md:inline text-sm text-gray-400 hover:text-gray-600 transition-colors px-3">Salir</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary !py-2 !px-4 md:!px-5 text-xs md:text-sm">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  )
}
