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

// Verifica que una coordenada esté dentro del territorio mexicano
function dentroMexico(lat: number, lng: number) {
  return lat >= 14.5 && lat <= 32.75 && lng >= -118.5 && lng <= -86.7
}

const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
  html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));user-select:none">📍</div>`,
})

// Escucha clicks en el mapa y llama al callback
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

// Llama invalidateSize después de que el contenedor es visible
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
    // Abrir mapa automáticamente si ya tiene coordenadas
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

  // Centro del mapa: coordenadas actuales si existen, si no el default
  const mapCenter: [number, number] = form.latitud && form.longitud
    ? [form.latitud, form.longitud]
    : MAP_CENTER

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-brand-coffee text-lg">
              {sucursal ? 'Editar sucursal' : 'Nueva sucursal'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{clienteNombre}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className="label">Nombre de la sucursal *</label>
              <input value={form.nombre_sucursal} onChange={e => set('nombre_sucursal', e.target.value)}
                className="input" placeholder="Ej: Sucursal Centro" required />
            </div>

            <div>
              <label className="label">Tipo de negocio</label>
              <input value={form.tipo_negocio} onChange={e => set('tipo_negocio', e.target.value)}
                className="input" placeholder="Ej: Tortillería, Restaurante" />
            </div>

            <div>
              <label className="label">Estatus</label>
              <select value={form.estatus} onChange={e => set('estatus', e.target.value)} className="input">
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="label">Responsable</label>
              <input value={form.responsable} onChange={e => set('responsable', e.target.value)}
                className="input" placeholder="Nombre del responsable" />
            </div>

            <div>
              <label className="label">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className="input" placeholder="771 000 0000" />
            </div>

            <div>
              <label className="label">Días de visita</label>
              <input value={form.dias_visita} onChange={e => set('dias_visita', e.target.value)}
                className="input" placeholder="Ej: Lunes y Jueves" />
            </div>

            <div>
              <label className="label">Capacidad del refri (piezas)</label>
              <input type="number" min="0" value={form.capacidad_refri ?? ''}
                onChange={e => set('capacidad_refri', e.target.value ? Number(e.target.value) : null)}
                className="input" placeholder="Ej: 100" />
            </div>

            {/* Dirección + Geocode */}
            <div className="sm:col-span-2">
              <label className="label">Dirección</label>
              <div className="flex gap-2">
                <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
                  className="input" placeholder="Calle, Colonia, Ciudad" />
                <button type="button" onClick={handleGeocode} disabled={geoLoading || !form.direccion}
                  className="flex-shrink-0 px-3 py-2 bg-brand-ocean text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-40 whitespace-nowrap">
                  {geoLoading ? '...' : '🔍 Buscar'}
                </button>
              </div>
            </div>

            {/* Toggle mapa */}
            <div className="sm:col-span-2">
              <button type="button" onClick={() => setMapOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                  mapOpen
                    ? 'bg-brand-ocean/10 border-brand-ocean/30 text-brand-ocean'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}>
                <span className="flex items-center gap-2">
                  <span>📍</span>
                  {form.latitud && form.longitud
                    ? `Marcador: ${form.latitud.toFixed(4)}, ${form.longitud.toFixed(4)}`
                    : 'Colocar en mapa'}
                </span>
                <span className="text-xs text-gray-400">{mapOpen ? '▲ ocultar' : '▼ abrir'}</span>
              </button>
            </div>

            {/* Mapa interactivo */}
            {mapOpen && (
              <div className="sm:col-span-2 rounded-xl overflow-hidden border border-gray-200 relative" style={{ height: 240 }}>
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
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap z-[999]">
                  Toca el mapa para colocar · arrastra el pin para mover
                </div>
              </div>
            )}

            {/* Coordenadas manuales (colapsadas si el mapa está abierto) */}
            {!mapOpen && (
              <>
                <div>
                  <label className="label">Latitud</label>
                  <input type="number" step="any" value={form.latitud ?? ''}
                    onChange={e => set('latitud', e.target.value ? parseFloat(e.target.value) : null)}
                    className="input font-mono text-xs" placeholder="20.000000" />
                </div>
                <div>
                  <label className="label">Longitud</label>
                  <input type="number" step="any" value={form.longitud ?? ''}
                    onChange={e => set('longitud', e.target.value ? parseFloat(e.target.value) : null)}
                    className="input font-mono text-xs" placeholder="-98.000000" />
                </div>
              </>
            )}

            {form.latitud && form.longitud && (
              <div className="sm:col-span-2 flex items-center gap-3">
                <a href={`https://www.google.com/maps?q=${form.latitud},${form.longitud}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-brand-ocean font-semibold hover:opacity-70">
                  Ver en Google Maps →
                </a>
                <button type="button"
                  onClick={() => { set('latitud', null); set('longitud', null) }}
                  className="text-xs text-gray-400 hover:text-red-400 font-semibold">
                  Quitar coordenadas
                </button>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                className="input resize-none h-16" placeholder="Observaciones del punto de venta..." />
            </div>
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
            {loading ? 'Guardando...' : sucursal ? 'Guardar cambios' : 'Crear sucursal'}
          </button>
        </div>
      </div>
    </div>
  )
}
