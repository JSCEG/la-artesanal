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
    // Preview local inmediato
    setPhotoPreview(URL.createObjectURL(file))
    setUploadingPhoto(true)
    // Subir a Supabase Storage (usamos un ID temporal si es nuevo)
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-black text-brand-coffee text-lg">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="label">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="input" placeholder="Ej: Paleta de Tamarindo" required />
            </div>

            {/* Categoría */}
            <div>
              <label className="label">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
                {CATEGORIAS_PRODUCTO.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Unidad */}
            <div>
              <label className="label">Unidad</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input">
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>

            {/* SKU */}
            <div>
              <label className="label">SKU</label>
              <input value={form.sku} onChange={e => set('sku', e.target.value)}
                className="input" placeholder="Ej: PAL-013" />
            </div>

            {/* Activo */}
            <div className="flex items-center gap-3 pt-5">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${form.is_active ? 'bg-brand-berry' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-semibold text-gray-700">{form.is_active ? 'Activo' : 'Inactivo'}</span>
            </div>

            {/* Descripción */}
            <div className="sm:col-span-2">
              <label className="label">Descripción</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                className="input resize-none h-20" placeholder="Breve descripción del producto..." />
            </div>

            {/* Precios */}
            <div>
              <label className="label">Precio minorista (MXN)</label>
              <input type="number" min="0" step="1"
                value={form.precio_minorista ?? ''}
                onChange={e => set('precio_minorista', e.target.value ? Number(e.target.value) : null)}
                className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Precio mayorista (MXN)</label>
              <input type="number" min="0" step="1"
                value={form.precio_mayorista ?? ''}
                onChange={e => set('precio_mayorista', e.target.value ? Number(e.target.value) : null)}
                className="input" placeholder="0" />
            </div>
          </div>

          {/* Foto del producto */}
          <div className="sm:col-span-2">
            <label className="label">Foto del producto</label>

            {/* Preview */}
            {photoPreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 mb-2 group">
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold animate-pulse">Subiendo...</span>
                  </div>
                )}
                {!uploadingPhoto && (
                  <button type="button" onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 bg-black/60 text-white w-7 h-7 rounded-full text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100">
                    ×
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-brand-berry hover:bg-brand-berry/5 transition-all mb-2"
              >
                <span className="text-2xl">📷</span>
                <span className="text-xs text-gray-400 font-medium">Click para subir imagen</span>
                <span className="text-xs text-gray-300">JPG, PNG, WEBP — máx 5MB</span>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={handleFileChange} />

            {/* O pegar URL */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">o pegar URL</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <input
              type="url"
              value={form.photo_url && !form.photo_url.startsWith('blob:') ? form.photo_url : ''}
              onChange={e => { set('photo_url', e.target.value || null); setPhotoPreview(e.target.value || null) }}
              className="input mt-2"
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 bg-brand-berry text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
