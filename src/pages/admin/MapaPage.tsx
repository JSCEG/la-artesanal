import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getSucursales } from '../../services/clientes'
import type { Sucursal } from '../../services/clientes'
import EmptyState from '../../components/admin/EmptyState'
import { Skeleton } from '../../components/admin/Skeleton'
import { useToast } from '../../context/ToastContext'

// Territorio mexicano
const MEXICO_BOUNDS: L.LatLngBoundsExpression = [[14.5, -118.5], [32.75, -86.7]]
const MEXICO_CENTER: [number, number] = [23.6, -102.5]
const MEXICO_MIN_ZOOM = 5

// ── Estatus: color del BORDE del marcador ──────────────────────────────────
const ESTATUS: Record<string, { border: string; label: string; badge: string; opacity: string }> = {
  activo:   { border: '#22c55e', label: 'Activo',   badge: 'bg-green-100 text-green-700',  opacity: '1'   },
  pausado:  { border: '#f59e0b', label: 'Pausado',  badge: 'bg-yellow-100 text-yellow-700', opacity: '1'   },
  inactivo: { border: '#9ca3af', label: 'Inactivo', badge: 'bg-gray-100 text-gray-500',    opacity: '0.45' },
}

// ── Color de FONDO del marcador, uno por cliente (cicla si hay más de 10) ──
const PALETTE = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#8b5cf6', // violeta
  '#0ea5e9', // cielo
  '#ef4444', // rojo
  '#84cc16', // lima
  '#64748b', // slate
  '#06b6d4', // cyan
]

function makeIcon(estatus: string, colorIdx: number, initials: string) {
  const e = ESTATUS[estatus] ?? ESTATUS.inactivo
  const bg = PALETTE[colorIdx % PALETTE.length]
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    html: `<div style="
      position:relative;width:32px;height:38px;
      display:flex;flex-direction:column;align-items:center;
      opacity:${e.opacity};
    ">
      <div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${bg};border:3px solid ${e.border};
        box-shadow:0 3px 8px rgba(0,0,0,.4);
      "></div>
      <span style="
        position:absolute;top:4px;left:0;width:32px;
        text-align:center;font-size:11px;font-weight:800;
        color:#fff;letter-spacing:-0.5px;line-height:1;
        text-shadow:0 1px 2px rgba(0,0,0,.5);
      ">${initials}</span>
    </div>`,
  })
}

// ── Vuela a un marcador al hacer clic en el panel ──────────────────────────
function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1 })
  }, [position, map])
  return null
}

// ── Ajusta la vista para mostrar todos los marcadores al cargar ─────────────
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) {
      map.setView(positions[0], 14)
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 14 })
    }
  }, [])   // Solo en mount — después el usuario controla el zoom
  return null
}

// ── Página principal ────────────────────────────────────────────────────────
export default function MapaPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState<string>('todos')
  const [foco, setFoco] = useState<[number, number] | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const toast = useToast()

  useEffect(() => {
    getSucursales()
      .then(data => setSucursales(data))
      .catch(() => toast.error('No se pudo cargar el mapa'))
      .finally(() => setLoading(false))
  }, [toast])

  // Solo las que tienen coordenadas
  const conCoordenadas = useMemo(() =>
    sucursales.filter(s => s.latitud && s.longitud), [sucursales])

  const sinCoordenadas = useMemo(() =>
    sucursales.filter(s => !s.latitud || !s.longitud), [sucursales])

  // Filtrado para la lista del panel
  const filtradas = useMemo(() => {
    return conCoordenadas.filter(s => {
      const q = busqueda.toLowerCase()
      const coincide = !q ||
        s.nombre_sucursal.toLowerCase().includes(q) ||
        (s.cliente?.nombre_comercial ?? '').toLowerCase().includes(q) ||
        (s.responsable ?? '').toLowerCase().includes(q)
      const estatusOk = filtroEstatus === 'todos' || s.estatus === filtroEstatus
      return coincide && estatusOk
    })
  }, [conCoordenadas, busqueda, filtroEstatus])

  // Posiciones con coordenadas válidas (dentro de México)
  const posiciones = useMemo((): [number, number][] =>
    conCoordenadas.map(s => [s.latitud!, s.longitud!]),
    [conCoordenadas]
  )

  // Asigna un índice de color de paleta a cada cliente único
  const clienteColorIdx = useMemo(() => {
    const map = new Map<string, number>()
    const uniqueIds = [...new Set(conCoordenadas.map(s => s.cliente_id))]
    uniqueIds.forEach((id, i) => map.set(id, i))
    return map
  }, [conCoordenadas])

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Mapa de sucursales</h1>
          <p className="text-sm text-brand-wood-soft font-medium mt-1">
            {conCoordenadas.length} ubicadas · {sinCoordenadas.length} sin coordenadas
          </p>
        </div>
        {/* Leyenda estatus */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-brand-wood-soft font-bold">Borde:</span>
          {Object.entries(ESTATUS).map(([key, e]) => (
            <button
              key={key}
              onClick={() => setFiltroEstatus(filtroEstatus === key ? 'todos' : key)}
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full border transition-all ${
                filtroEstatus === key
                  ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/40 ring-2 ring-brand-berry/20'
                  : 'bg-white text-brand-wood border-brand-wood/15 hover:border-brand-berry/40'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 bg-white"
                style={{ borderColor: e.border }} />
              {e.label}
            </button>
          ))}
          {filtroEstatus !== 'todos' && (
            <button onClick={() => setFiltroEstatus('todos')}
              className="text-[10px] uppercase tracking-widest text-brand-wood-soft hover:text-brand-berry font-black">
              × todos
            </button>
          )}
          <span className="text-brand-wood/30">·</span>
          <span className="text-[10px] uppercase tracking-widest text-brand-wood-soft font-bold">Color = cliente</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-brand-wood/10 shadow-sm p-4">
          <Skeleton className="h-[60vh] min-h-[360px] w-full rounded-xl" />
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">

          {/* Panel lateral */}
          <div className={`bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] flex flex-col transition-all duration-200 flex-shrink-0 ${
            panelOpen ? 'w-72' : 'w-10'
          } hidden md:flex`}>
            {panelOpen ? (
              <>
                <div className="p-3 border-b border-brand-wood/10 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Buscar sucursal..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="input text-xs py-1.5 flex-1"
                  />
                  <button onClick={() => setPanelOpen(false)}
                    aria-label="Colapsar panel"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand-cream/60 text-brand-wood-soft flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-brand-wood/5">
                  {filtradas.length === 0 ? (
                    <div className="p-4 text-center text-xs text-brand-wood-soft">
                      No hay resultados
                    </div>
                  ) : (
                    filtradas.map(suc => (
                      <button
                        key={suc.id}
                        onClick={() => suc.latitud && suc.longitud && setFoco([suc.latitud, suc.longitud])}
                        className="w-full text-left px-3 py-2.5 hover:bg-brand-cream/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2"
                            style={{
                              background: PALETTE[clienteColorIdx.get(suc.cliente_id) ?? 0],
                              borderColor: ESTATUS[suc.estatus]?.border,
                            }}
                          />
                          <p className="text-xs font-bold text-brand-wood truncate">{suc.nombre_sucursal}</p>
                        </div>
                        <p className="text-xs text-brand-wood-soft mt-0.5 truncate ml-4.5">
                          {suc.cliente?.nombre_comercial}
                        </p>
                        {suc.responsable && (
                          <p className="text-xs text-brand-wood-soft truncate ml-4.5">{suc.responsable}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
                {sinCoordenadas.length > 0 && (
                  <div className="p-3 border-t border-brand-wood/10 bg-brand-coral/10 rounded-b-2xl">
                    <p className="text-xs text-brand-coral font-black uppercase tracking-wide flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                      {sinCoordenadas.length} {sinCoordenadas.length === 1 ? 'sucursal sin' : 'sucursales sin'} coordenadas
                    </p>
                    <p className="text-xs text-brand-wood-soft mt-1">Edítalas desde Clientes para ubicarlas.</p>
                  </div>
                )}
              </>
            ) : (
              <button onClick={() => setPanelOpen(true)}
                aria-label="Expandir panel"
                className="flex-1 flex items-center justify-center text-brand-wood-soft hover:text-brand-berry">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </div>

          {/* Mapa */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)]">
            {conCoordenadas.length === 0 ? (
              <div className="h-full p-4 flex items-center justify-center">
                <EmptyState
                  tone="teal"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" x2="8" y1="2" y2="18"/><line x1="16" x2="16" y1="6" y2="22"/></svg>}
                  title="Sin ubicaciones registradas"
                  description="Agregá coordenadas a las sucursales de tus clientes para verlas acá en el mapa."
                  action={<a href="/admin/clientes" className="btn-secondary text-sm">Ir a Clientes</a>}
                />
              </div>
            ) : (
              <MapContainer
                center={MEXICO_CENTER}
                zoom={6}
                minZoom={MEXICO_MIN_ZOOM}
                maxBounds={MEXICO_BOUNDS}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds positions={posiciones} />
                <FlyTo position={foco} />

                {conCoordenadas
                  .filter(s => filtroEstatus === 'todos' || s.estatus === filtroEstatus)
                  .map(suc => {
                    const nombre = suc.cliente?.nombre_comercial ?? ''
                    const initials = nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
                    const colorIdx = clienteColorIdx.get(suc.cliente_id) ?? 0
                    return (
                    <Marker
                      key={suc.id}
                      position={[suc.latitud!, suc.longitud!]}
                      icon={makeIcon(suc.estatus, colorIdx, initials)}
                    >
                      <Popup minWidth={220}>
                        <div className="text-sm space-y-1">
                          <p className="font-bold text-gray-800">{suc.nombre_sucursal}</p>
                          <p className="text-gray-500 text-xs">{suc.cliente?.nombre_comercial}</p>
                          {suc.tipo_negocio && (
                            <p className="text-gray-500 text-xs">🏢 {suc.tipo_negocio}</p>
                          )}
                          {suc.responsable && (
                            <p className="text-gray-500 text-xs">👤 {suc.responsable}</p>
                          )}
                          {suc.telefono && (
                            <p className="text-gray-500 text-xs">📞 {suc.telefono}</p>
                          )}
                          {suc.direccion && (
                            <p className="text-gray-500 text-xs">📍 {suc.direccion}</p>
                          )}
                          {suc.dias_visita && (
                            <p className="text-gray-500 text-xs">📅 {suc.dias_visita}</p>
                          )}
                          {suc.capacidad_refri && (
                            <p className="text-gray-500 text-xs">🧊 {suc.capacidad_refri} piezas</p>
                          )}
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${ESTATUS[suc.estatus]?.badge}`}>
                            {ESTATUS[suc.estatus]?.label}
                          </span>
                          <div className="pt-1">
                            <a
                              href={`https://www.google.com/maps?q=${suc.latitud},${suc.longitud}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Ver en Google Maps →
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                  })}
              </MapContainer>
            )}
          </div>
        </div>
      )}

      {/* Lista móvil (debajo del mapa en móvil) */}
      <div className="md:hidden space-y-2">
        <h2 className="text-sm font-black text-brand-wood">
          {filtradas.length} sucursales en mapa
        </h2>
        {filtradas.map(suc => (
          <div key={suc.id} className="bg-white rounded-xl border border-brand-wood/10 px-3 py-2.5 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0 border-2"
              style={{
                background: PALETTE[clienteColorIdx.get(suc.cliente_id) ?? 0],
                borderColor: ESTATUS[suc.estatus]?.border,
              }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brand-wood truncate">{suc.nombre_sucursal}</p>
              <p className="text-xs text-brand-wood-soft truncate">{suc.cliente?.nombre_comercial}</p>
            </div>
            <a href={`https://www.google.com/maps?q=${suc.latitud},${suc.longitud}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-brand-teal font-black uppercase tracking-wide flex-shrink-0">
              Maps
            </a>
          </div>
        ))}
      </div>

    </div>
  )
}
