import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'

const LOGO_URL = 'https://pub-74e211e7329944698d66a7be2d5a8eca.r2.dev/la-artesanal/img/logo.png'
const POSTER  = 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=1600&h=900&fit=crop&auto=format'
const VIDEO_URL = 'https://cdn.sassoapps.com/la-artesanal/video/video.mp4'

export default function RegistroPage() {
  const { signUp } = useSession()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    setError('')
    const { error } = await signUp(email, password, nombre, 'minorista')
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4">

      {/* Video de fondo */}
      <video
        className="absolute inset-0 w-full h-full object-cover -z-20"
        src={VIDEO_URL}
        poster={POSTER}
        autoPlay loop muted playsInline
      />

      {/* Overlay: gradiente marca + tinte oscuro para legibilidad */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-berry/60 via-brand-wood/40 to-brand-teal/60" />
      <div className="absolute inset-0 -z-10 bg-black/30" />

      {/* Link volver — flotante */}
      <Link to="/" className="absolute top-4 left-4 md:top-6 md:left-6 z-10 flex items-center gap-2 text-white/90 hover:text-white font-semibold text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Volver
      </Link>

      {/* Card glass */}
      <div className="relative w-full max-w-md">
        <div className="bg-white/85 backdrop-blur-2xl rounded-[2rem] p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-white/60">

          {/* Logo con aro */}
          <div className="flex flex-col items-center mb-6">
            <span className="logo-glass rounded-full p-2 mb-4">
              <img src={LOGO_URL} alt="La Artesanal"
                className="w-20 h-20 rounded-full border-2 border-white bg-white shadow-md" />
            </span>
            <h1 className="font-display text-3xl font-black text-brand-wood">Crea tu cuenta</h1>
            <p className="text-sm text-brand-wood-soft mt-1 font-medium">Gratis, en menos de un minuto</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-wood/70 mb-2">Nombre</label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-brand-wood/15 bg-white text-sm font-medium focus:outline-none focus:border-brand-berry focus:ring-4 focus:ring-brand-berry/15 transition-all"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-wood/70 mb-2">Correo</label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-brand-wood/15 bg-white text-sm font-medium focus:outline-none focus:border-brand-berry focus:ring-4 focus:ring-brand-berry/15 transition-all"
                  placeholder="tu@correo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-wood/70 mb-2">Contraseña</label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-brand-wood/15 bg-white text-sm font-medium focus:outline-none focus:border-brand-berry focus:ring-4 focus:ring-brand-berry/15 transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full !py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-brand-wood/10 text-center">
            <p className="text-sm text-brand-wood-soft">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-bold text-brand-berry hover:text-brand-berry-soft transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
