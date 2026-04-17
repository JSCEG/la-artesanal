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

const ICONS = {
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  warn: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  credit: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
    </svg>
  ),
}

const TIPOS = [
  { value: 'mayorista', label: 'Mayorista', tone: 'teal'  },
  { value: 'minorista', label: 'Minorista', tone: 'berry' },
  { value: 'evento',    label: 'Evento',    tone: 'coral' },
] as const

function tipoClasses(tone: string, active: boolean) {
  if (!active) return 'bg-white border-brand-wood/15 text-brand-wood hover:border-brand-wood/30'
  if (tone === 'teal')  return 'bg-brand-teal/10 border-brand-teal/40 text-brand-teal ring-2 ring-brand-teal/25'
  if (tone === 'berry') return 'bg-brand-berry/10 border-brand-berry/40 text-brand-berry ring-2 ring-brand-berry/25'
  return 'bg-brand-coral/15 border-brand-coral/40 text-brand-coral ring-2 ring-brand-coral/25'
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">
              {cliente ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">
              {cliente ? 'Actualiza datos y configuración de crédito' : 'Registra un nuevo cliente mayorista, minorista o de evento'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors">
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Nombre comercial */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Nombre comercial *</label>
              <input value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)}
                className="input w-full" placeholder="Ej: Tortillería San Juan" required />
            </div>

            {/* Tipo de cliente — chips */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Tipo de cliente</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t => {
                  const active = form.tipo === t.value
                  return (
                    <button key={t.value} type="button" onClick={() => set('tipo', t.value)}
                      className={`rounded-xl border-2 px-3 py-2.5 font-bold text-[11px] uppercase tracking-widest transition-all ${tipoClasses(t.tone, active)}`}>
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Activo */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('activo', !form.activo)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${form.activo ? 'bg-brand-teal' : 'bg-brand-wood/15'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.activo ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-bold text-brand-wood">{form.activo ? 'Cliente activo' : 'Cliente inactivo'}</span>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Contacto principal</label>
                <input value={form.contacto_principal} onChange={e => set('contacto_principal', e.target.value)}
                  className="input w-full" placeholder="Nombre del responsable" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Teléfono</label>
                <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                  className="input w-full" placeholder="771 000 0000" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Correo</label>
                <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)}
                  className="input w-full" placeholder="contacto@negocio.com" />
              </div>
            </div>

            {/* Fiscales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Razón social</label>
                <input value={form.razon_social} onChange={e => set('razon_social', e.target.value)}
                  className="input w-full" placeholder="Opcional" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">RFC</label>
                <input value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())}
                  className="input w-full font-mono" placeholder="XAXX010101000" />
              </div>
            </div>

            {/* Crédito — card destacada */}
            <div className={`rounded-2xl p-4 space-y-3 border-2 transition-colors ${
              form.maneja_credito
                ? 'bg-gradient-to-br from-brand-berry/5 to-brand-berry/10 border-brand-berry/25'
                : 'bg-brand-cream/40 border-brand-wood/10'
            }`}>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('maneja_credito', !form.maneja_credito)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${form.maneja_credito ? 'bg-brand-berry' : 'bg-brand-wood/15'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.maneja_credito ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <span className={`${form.maneja_credito ? 'text-brand-berry' : 'text-brand-wood-soft'}`}>{ICONS.credit}</span>
                  <span className="text-sm font-bold text-brand-wood">Maneja crédito</span>
                </div>
              </div>
              {form.maneja_credito && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Límite de crédito (MXN)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-black text-brand-wood-soft pointer-events-none select-none">$</span>
                    <input type="number" min="0" value={form.limite_credito}
                      onChange={e => set('limite_credito', Number(e.target.value))}
                      className="input w-full !pl-10 font-display text-lg font-black" placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Notas internas</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                className="input w-full resize-none" rows={2} placeholder="Observaciones, preferencias, etc." />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-brand-berry/10 border-2 border-brand-berry/25 rounded-xl px-4 py-3">
                <span className="text-brand-berry mt-0.5">{ICONS.warn}</span>
                <p className="text-xs text-brand-berry font-bold flex-1">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-brand-wood/10 bg-brand-cream/20 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-wood/15 text-brand-wood font-black text-[11px] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Guardando…
                </>
              ) : cliente ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
