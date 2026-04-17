import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'

export default function RegistroPage() {
  const { signUp } = useSession()
  const navigate = useNavigate()
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
    } else {
      navigate('/cuenta')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-full bg-brand-berry flex items-center justify-center">
              <span className="text-white font-black text-sm">LA</span>
            </div>
            <span className="font-black text-brand-coffee text-xl">La Artesanal</span>
          </Link>
          <h1 className="text-2xl font-black text-brand-coffee">Crea tu cuenta</h1>
          <p className="text-sm text-gray-500 mt-1">Gratis y en menos de un minuto</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-berry"
                placeholder="Tu nombre completo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-berry"
                placeholder="tu@correo.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-berry"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-berry text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            {/* Placeholder Google - Fase futura */}
            {/* <button type="button" className="w-full border border-gray-200 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              <img src="/icons/google.svg" className="w-4 h-4" /> Continuar con Google
            </button> */}
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-berry font-semibold hover:opacity-80">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
