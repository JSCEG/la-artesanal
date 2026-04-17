import { useEffect, useRef, useState } from 'react'
import { CATEGORIAS_PRODUCTO, UNIDADES, upsertProducto, uploadProductPhoto } from '../../services/productos'
import type { ProductoConPrecios, ProductoFormData } from '../../services/productos'

interface Props {
  producto?: ProductoConPrecios | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY: ProductoFormData = {
  name: '', category: 'Paletas', description: '', sku: '',
  unit: 'pieza', is_active: true, precio_minorista: null, precio_mayorista: null, photo_url: null,
}

const ICONS = {
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  camera: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/>
      <circle cx="12" cy="13" r="3.5"/>
    </svg>
  ),
  warn: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
}

export default function ProductoModal({ producto, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ProductoFormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!producto

  useEffect(() => {
    if (producto) {
      setForm({
        name: producto.name,
        category: producto.category,
        description: producto.description ?? '',
        sku: producto.sku ?? '',
        unit: producto.unit,
        is_active: producto.is_active,
        precio_minorista: producto.precio_minorista ?? null,
        precio_mayorista: producto.precio_mayorista ?? null,
        photo_url: producto.photo_url ?? null,
      })
      setPhotoPreview(producto.photo_url ?? null)
    } else {
      setForm(EMPTY)
      setPhotoPreview(null)
    }
  }, [producto])

  const set = (field: keyof ProductoFormData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }))

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setUploadingPhoto(true)
    const tempId = producto?.id ?? `new-${Date.now()}`
    const url = await uploadProductPhoto(file, tempId)
    if (url) { set('photo_url', url); setPhotoPreview(url) }
    else setError('Error al subir la imagen')
    setUploadingPhoto(false)
  }

  function handleRemovePhoto() {
    set('photo_url', null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setLoading(true)
    setError('')
    const { error } = await upsertProducto(form, producto?.id)
    if (error) { setError(error); setLoading(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">
              {isEdit ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">
              {isEdit ? 'Actualiza datos, precios y foto' : 'Define nombre, categoría, precios y foto del producto'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors">
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Nombre */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="input w-full" placeholder="Ej: Paleta de Tamarindo" required />
            </div>

            {/* Categoría + Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Categoría</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className="input w-full">
                  {CATEGORIAS_PRODUCTO.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Unidad</label>
                <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input w-full">
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {/* SKU + activo */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">SKU</label>
                <input value={form.sku} onChange={e => set('sku', e.target.value)}
                  className="input w-full font-mono" placeholder="Ej: PAL-013" />
              </div>
              <div className="flex items-center gap-3 pb-2">
                <button type="button" onClick={() => set('is_active', !form.is_active)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${form.is_active ? 'bg-brand-teal' : 'bg-brand-wood/15'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-bold text-brand-wood">{form.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Descripción</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                className="input w-full resize-none" rows={2} placeholder="Breve descripción del producto…" />
            </div>

            {/* Precios — card destacada */}
            <div className="rounded-2xl p-4 space-y-3 border-2 bg-gradient-to-br from-brand-berry/5 to-brand-berry/10 border-brand-berry/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-berry">Precios de venta</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Minorista</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-black text-brand-wood-soft pointer-events-none select-none">$</span>
                    <input type="number" min="0" step="1"
                      value={form.precio_minorista ?? ''}
                      onChange={e => set('precio_minorista', e.target.value ? Number(e.target.value) : null)}
                      className="input w-full !pl-10 font-display text-lg font-black" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Mayorista</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-black text-brand-wood-soft pointer-events-none select-none">$</span>
                    <input type="number" min="0" step="1"
                      value={form.precio_mayorista ?? ''}
                      onChange={e => set('precio_mayorista', e.target.value ? Number(e.target.value) : null)}
                      className="input w-full !pl-10 font-display text-lg font-black" placeholder="0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Foto */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Foto del producto</label>

              {photoPreview ? (
                <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-brand-wood/10 mb-2 group">
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex items-center gap-2 text-white">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span className="text-sm font-bold">Subiendo…</span>
                      </div>
                    </div>
                  )}
                  {!uploadingPhoto && (
                    <button type="button" onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-brand-berry transition-colors opacity-0 group-hover:opacity-100">
                      {ICONS.trash}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-brand-wood/15 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-brand-berry/40 hover:bg-brand-berry/5 transition-all mb-2 text-brand-wood-soft hover:text-brand-berry"
                >
                  {ICONS.camera}
                  <span className="text-xs font-bold uppercase tracking-widest">Click para subir imagen</span>
                  <span className="text-[10px] text-brand-wood-soft">JPG, PNG, WEBP — máx 5MB</span>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={handleFileChange} />

              {/* Separador "o pegar URL" */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-px bg-brand-wood/10" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">O pegar URL</span>
                <div className="flex-1 h-px bg-brand-wood/10" />
              </div>
              <input
                type="url"
                value={form.photo_url && !form.photo_url.startsWith('blob:') ? form.photo_url : ''}
                onChange={e => { set('photo_url', e.target.value || null); setPhotoPreview(e.target.value || null) }}
                className="input w-full mt-2"
                placeholder="https://ejemplo.com/imagen.jpg"
              />
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
              ) : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
