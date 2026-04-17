import { useEffect, useState } from 'react'
import type { Cliente, ClienteFormData } from '../../services/clientes'
import { upsertCliente } from '../../services/clientes'

interface Props {
  cliente?: Cliente | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY: ClienteFormData = {
  nombre_comercial: '', tipo: 'mayorista', contacto_principal: '',
  telefono: '', correo: '', razon_social: '', rfc: '',
  maneja_credito: false, limite_credito: 0, notas: '', activo: true,
}

export default function ClienteModal({ cliente, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ClienteFormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(cliente ? {
      nombre_comercial: cliente.nombre_comercial,
      tipo: cliente.tipo,
      contacto_principal: cliente.contacto_principal ?? '',
      telefono: cliente.telefono ?? '',
      correo: cliente.correo ?? '',
      razon_social: cliente.razon_social ?? '',
      rfc: cliente.rfc ?? '',
      maneja_credito: cliente.maneja_credito,
      limite_credito: cliente.limite_credito,
      notas: cliente.notas ?? '',
      activo: cliente.activo,
    } : EMPTY)
    setError('')
  }, [cliente])

  const set = (f: keyof ClienteFormData, v: any) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_comercial.trim()) { setError('El nombre es requerido'); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await upsertCliente(form, cliente?.id)
      if (error) { setError(error.message); setLoading(false); return }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Error inesperado al guardar')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-black text-brand-coffee text-lg">
            {cliente ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className="label">Nombre comercial *</label>
              <input value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)}
                className="input" placeholder="Ej: Tortillería San Juan" required />
            </div>

            <div>
              <label className="label">Tipo de cliente</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="input">
                <option value="mayorista">Mayorista</option>
                <option value="minorista">Minorista</option>
                <option value="evento">Evento</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-5">
              <button type="button" onClick={() => set('activo', !form.activo)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${form.activo ? 'bg-brand-berry' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.activo ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-semibold text-gray-700">{form.activo ? 'Activo' : 'Inactivo'}</span>
            </div>

            <div>
              <label className="label">Contacto principal</label>
              <input value={form.contacto_principal} onChange={e => set('contacto_principal', e.target.value)}
                className="input" placeholder="Nombre del responsable" />
            </div>

            <div>
              <label className="label">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className="input" placeholder="771 000 0000" />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Correo</label>
              <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)}
                className="input" placeholder="contacto@negocio.com" />
            </div>

            {/* Crédito */}
            <div className="sm:col-span-2 bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('maneja_credito', !form.maneja_credito)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${form.maneja_credito ? 'bg-brand-ocean' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.maneja_credito ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-semibold text-gray-700">Maneja crédito</span>
              </div>
              {form.maneja_credito && (
                <div>
                  <label className="label">Límite de crédito (MXN)</label>
                  <input type="number" min="0" value={form.limite_credito}
                    onChange={e => set('limite_credito', Number(e.target.value))}
                    className="input" placeholder="0" />
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="label">Notas internas</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                className="input resize-none h-16" placeholder="Observaciones, preferencias, etc." />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </form>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 bg-brand-berry text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
            {loading ? 'Guardando...' : cliente ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}
