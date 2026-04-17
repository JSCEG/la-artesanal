import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Sucursal, SucursalFormData } from '../../services/clientes'
import { upsertSucursal } from '../../services/clientes'

interface Props {
  clienteId: string
  clienteNombre: string
  sucursal?: Sucursal | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY: SucursalFormData = {
  nombre_sucursal: '', direccion: '', latitud: null, longitud: null,
  responsable: '', telefono: '', tipo_negocio: '', dias_visita: '',
  capacidad_refri: null, estatus: 'activo', notas: '',
}

// Centro entre Huasca de Ocampo y CDMX
const MAP_CENTER: [number, number] = [20.0, -98.85]
const MAP_ZOOM = 9

// Límites de México: SW → NE
const MEXICO_BOUNDS: L.LatLngBoundsExpression = [[14.5, -118.5], [32.75, -86.7]]
const MEXICO_MIN_ZOOM = 5

function dentroMexico(lat: number, lng: number) {
  return lat >= 14.5 && lat <= 32.75 && lng >= -118.5 && lng <= -86.7
}

// Pin SVG con colores de marca
const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));user-select:none">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18s12-9 12-18c0-6.6-5.4-12-12-12z" fill="#b1306b"/>
    <circle cx="12" cy="12" r="4.5" fill="#fff"/>
  </svg>`,
})

const ICONS = {
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  pin: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  warn: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  chevronDown: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  external: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>
  ),
}

const ESTATUS_OPTS = [
  { value: 'activo',   label: 'Activo',   tone: 'teal'  },
  { value: 'pausado',  label: 'Pausado',  tone: 'coral' },
  { value: 'inactivo', label: 'Inactivo', tone: 'wood'  },
] as const

function estatusClasses(tone: string, active: boolean) {
  if (!active) return 'bg-white border-brand-wood/15 text-brand-wood hover:border-brand-wood/30'
  if (tone === 'teal')  return 'bg-brand-teal/10 border-brand-teal/40 text-brand-teal ring-2 ring-brand-teal/25'
  if (tone === 'coral') return 'bg-brand-coral/15 border-brand-coral/40 text-brand-coral ring-2 ring-brand-coral/25'
  return 'bg-brand-wood/10 border-brand-wood/30 text-brand-wood ring-2 ring-brand-wood/20'
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(t)
  }, [map])
  return null
}

export default function SucursalModal({ clienteId, clienteNombre, sucursal, onClose, onSaved }: Props) {
  const [form, setForm] = useState<SucursalFormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)

  useEffect(() => {
    const data: SucursalFormData = sucursal ? {
      nombre_sucursal: sucursal.nombre_sucursal,
      direccion:       sucursal.direccion ?? '',
      latitud:         sucursal.latitud,
      longitud:        sucursal.longitud,
      responsable:     sucursal.responsable ?? '',
      telefono:        sucursal.telefono ?? '',
      tipo_negocio:    sucursal.tipo_negocio ?? '',
      dias_visita:     sucursal.dias_visita ?? '',
      capacidad_refri: sucursal.capacidad_refri,
      estatus:         sucursal.estatus,
      notas:           sucursal.notas ?? '',
    } : EMPTY
    setForm(data)
    setError('')
    setMapOpen(!!(sucursal?.latitud && sucursal?.longitud))
  }, [sucursal])

  const set = (f: keyof SucursalFormData, v: any) => setForm(p => ({ ...p, [f]: v }))

  function handleMapClick(lat: number, lng: number) {
    set('latitud', parseFloat(lat.toFixed(6)))
    set('longitud', parseFloat(lng.toFixed(6)))
  }

  async function handleGeocode() {
    if (!form.direccion.trim()) return
    setGeoLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.direccion)}&limit=1`
      )
      const data = await res.json()
      if (data[0]) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        if (!dentroMexico(lat, lng)) {
          setError('La dirección encontrada está fuera de México. Verifica o coloca el marcador manualmente.')
        } else {
          set('latitud', lat)
          set('longitud', lng)
          setMapOpen(true)
        }
      } else {
        setError('No se encontró la dirección. Coloca el marcador manualmente.')
      }
    } catch { setError('Error al buscar coordenadas') }
    setGeoLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_sucursal.trim()) { setError('El nombre es requerido'); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await upsertSucursal(form, clienteId, sucursal?.id)
      if (error) { setError(error.message); setLoading(false); return }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Error inesperado al guardar')
      setLoading(false)
    }
  }

  const mapCenter: [number, number] = form.latitud && form.longitud
    ? [form.latitud, form.longitud]
    : MAP_CENTER

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">
              {sucursal ? 'Editar sucursal' : 'Nueva sucursal'}
            </h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5 truncate">
              <span className="text-brand-berry font-black">{clienteNombre}</span>
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors flex-shrink-0">
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Nombre */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Nombre de la sucursal *</label>
              <input value={form.nombre_sucursal} onChange={e => set('nombre_sucursal', e.target.value)}
                className="input w-full" placeholder="Ej: Sucursal Centro" required />
            </div>

            {/* Tipo de negocio + Estatus chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Tipo de negocio</label>
                <input value={form.tipo_negocio} onChange={e => set('tipo_negocio', e.target.value)}
                  className="input w-full" placeholder="Ej: Tortillería, Restaurante" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Estatus</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ESTATUS_OPTS.map(op => {
                    const active = form.estatus === op.value
                    return (
                      <button key={op.value} type="button" onClick={() => set('estatus', op.value)}
                        className={`rounded-xl border-2 px-2 py-2 font-bold text-[10px] uppercase tracking-widest transition-all ${estatusClasses(op.tone, active)}`}>
                        {op.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Responsable + Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Responsable</label>
                <input value={form.responsable} onChange={e => set('responsable', e.target.value)}
                  className="input w-full" placeholder="Nombre del responsable" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Teléfono</label>
                <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                  className="input w-full" placeholder="771 000 0000" />
              </div>
            </div>

            {/* Días de visita + Capacidad refri */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Días de visita</label>
                <input value={form.dias_visita} onChange={e => set('dias_visita', e.target.value)}
                  className="input w-full" placeholder="Ej: Lunes y Jueves" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Capacidad del refri (pz)</label>
                <input type="number" min="0" value={form.capacidad_refri ?? ''}
                  onChange={e => set('capacidad_refri', e.target.value ? Number(e.target.value) : null)}
                  className="input w-full" placeholder="Ej: 100" />
              </div>
            </div>

            {/* Ubicación — card destacada */}
            <div className="rounded-2xl p-4 space-y-3 border-2 bg-gradient-to-br from-brand-teal/5 to-brand-teal/10 border-brand-teal/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-teal flex items-center gap-1.5">
                {ICONS.pin}
                Ubicación
              </p>

              {/* Dirección + Geocode */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Dirección</label>
                <div className="flex gap-2">
                  <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
                    className="input w-full" placeholder="Calle, Colonia, Ciudad" />
                  <button type="button" onClick={handleGeocode} disabled={geoLoading || !form.direccion}
                    className="flex-shrink-0 px-3 py-2 bg-brand-teal text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5 shadow-[2px_2px_0_rgba(45,102,128,0.25)]">
                    {geoLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : ICONS.search}
                    Buscar
                  </button>
                </div>
              </div>

              {/* Toggle mapa */}
              <button type="button" onClick={() => setMapOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${
                  mapOpen
                    ? 'bg-white border-brand-teal/30 text-brand-teal'
                    : 'bg-white/60 border-brand-wood/15 text-brand-wood hover:border-brand-wood/30'
                }`}>
                <span className="flex items-center gap-2">
                  {ICONS.pin}
                  {form.latitud && form.longitud
                    ? <span className="font-mono text-[11px]">{form.latitud.toFixed(4)}, {form.longitud.toFixed(4)}</span>
                    : 'Colocar en mapa'}
                </span>
                <span className={`transition-transform ${mapOpen ? 'rotate-180' : ''}`}>{ICONS.chevronDown}</span>
              </button>

              {/* Mapa interactivo */}
              {mapOpen && (
                <div className="rounded-xl overflow-hidden border border-brand-wood/15 relative" style={{ height: 260 }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={form.latitud && form.longitud ? 15 : MAP_ZOOM}
                    minZoom={MEXICO_MIN_ZOOM}
                    maxBounds={MEXICO_BOUNDS}
                    maxBoundsViscosity={1.0}
                    style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapResizer />
                    <MapClickHandler onMapClick={handleMapClick} />
                    {form.latitud && form.longitud && (
                      <Marker
                        position={[form.latitud, form.longitud]}
                        icon={PIN_ICON}
                        draggable
                        eventHandlers={{
                          dragend(e) {
                            const { lat, lng } = (e.target as L.Marker).getLatLng()
                            set('latitud', parseFloat(lat.toFixed(6)))
                            set('longitud', parseFloat(lng.toFixed(6)))
                          },
                        }}
                      />
                    )}
                  </MapContainer>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-brand-wood/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full pointer-events-none whitespace-nowrap z-[999]">
                    Toca el mapa · arrastra el pin
                  </div>
                </div>
              )}

              {/* Coordenadas manuales (colapsadas si el mapa está abierto) */}
              {!mapOpen && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Latitud</label>
                    <input type="number" step="any" value={form.latitud ?? ''}
                      onChange={e => set('latitud', e.target.value ? parseFloat(e.target.value) : null)}
                      className="input w-full font-mono text-xs" placeholder="20.000000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Longitud</label>
                    <input type="number" step="any" value={form.longitud ?? ''}
                      onChange={e => set('longitud', e.target.value ? parseFloat(e.target.value) : null)}
                      className="input w-full font-mono text-xs" placeholder="-98.000000" />
                  </div>
                </div>
              )}

              {form.latitud && form.longitud && (
                <div className="flex items-center gap-3 flex-wrap">
                  <a href={`https://www.google.com/maps?q=${form.latitud},${form.longitud}`}
                    target="_blank" rel="noreferrer"
                    className="text-[10px] font-black uppercase tracking-widest text-brand-teal hover:opacity-70 flex items-center gap-1">
                    {ICONS.external}
                    Ver en Google Maps
                  </a>
                  <button type="button"
                    onClick={() => { set('latitud', null); set('longitud', null) }}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft hover:text-brand-berry">
                    Quitar coordenadas
                  </button>
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Notas</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                className="input w-full resize-none" rows={2} placeholder="Observaciones del punto de venta…" />
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
              ) : sucursal ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
