import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getSucursales } from '../../services/clientes'
import type { Sucursal } from '../../services/clientes'
import { getVentasPorSucursal, type VentaMes } from '../../services/dashboard'
import EmptyState from '../../components/admin/EmptyState'
import SucursalMiniChart from '../../components/admin/SucursalMiniChart'
import { Skeleton } from '../../components/admin/Skeleton'
import { useToast } from '../../context/ToastContext'

// Territorio mexicano
const MEXICO_BOUNDS: L.LatLngBoundsExpression = [[14.5, -118.5], [32.75, -86.7]]
const MEXICO_CENTER: [number, number] = [23.6, -102.5]
const MEXICO_MIN_ZOOM = 5

// Brand tokens resueltos para Leaflet (inline styles + popups HTML)
const BRAND = {
  teal:      '#0ea5a5', // brand-teal
  coral:     '#ef7a5a', // brand-coral
  woodSoft:  '#a08977', // brand-wood-soft
  wood:      '#4a2e1a', // brand-wood
  berry:     '#b1306b', // brand-berry
}

// ── Estatus: color del BORDE del marcador (tokens brand) ───────────────────
const ESTATUS: Record<string, {
  border: string; label: string; opacity: string;
  badgeBg: string; badgeText: string;
}> = {
  activo:   { border: BRAND.teal,     label: 'Activo',   opacity: '1',    badgeBg: 'bg-brand-teal/15',     badgeText: 'text-brand-teal'      },
  pausado:  { border: BRAND.coral,    label: 'Pausado',  opacity: '1',    badgeBg: 'bg-brand-coral/15',    badgeText: 'text-brand-coral'     },
  inactivo: { border: BRAND.woodSoft, label: 'Inactivo', opacity: '0.45', badgeBg: 'bg-brand-wood/10',     badgeText: 'text-brand-wood-soft' },
}

// ── Color de FONDO del marcador, uno por cliente (cicla si hay más de 10) ──
const PALETTE = [
  '#b1306b', // berry
  '#0ea5a5', // teal
  '#ef7a5a', // coral
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f97316', // orange
  '#8b5cf6', // violeta
  '#0ea5e9', // cielo
  '#84cc16', // lima
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

// Inline SVG icons (strings — se inyectan dentro del popup HTML de Leaflet)
const SVG = {
  building: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  user:     `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  phone:    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  pin:      `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>`,
  fridge:   `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M5 10h14"/><path d="M10 6v2"/><path d="M10 14v2"/></svg>`,
  external: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>`,
}

function popupRow(icon: string, text: string) {
  return `<p style="display:flex;align-items:center;gap:6px;color:${BRAND.woodSoft};font-size:11px;margin:2px 0">${icon}<span>${text}</span></p>`
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
  const [ventasMap, setVentasMap] = useState<Map<string, VentaMes[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState<string>('todos')
  const [foco, setFoco] = useState<[number, number] | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const toast = useToast()

  useEffect(() => {
    Promise.all([getSucursales(), getVentasPorSucursal(6)])
      .then(([sucs, ventas]) => {
        setSucursales(sucs)
        setVentasMap(ventas)
      })
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
          <div className="flex-1 rounded-2xl overflow-hidden border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] relative z-0">
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
                    const e = ESTATUS[suc.estatus] ?? ESTATUS.inactivo
                    return (
                    <Marker
                      key={suc.id}
                      position={[suc.latitud!, suc.longitud!]}
                      icon={makeIcon(suc.estatus, colorIdx, initials)}
                    >
                      <Popup minWidth={240}>
                        <div className="text-sm space-y-1">
                          <p className="font-black text-brand-wood" style={{ fontSize: 13 }}>{suc.nombre_sucursal}</p>
                          <p className="text-brand-wood-soft" style={{ fontSize: 11, marginBottom: 4 }}>{suc.cliente?.nombre_comercial}</p>
                          {suc.tipo_negocio && <span dangerouslySetInnerHTML={{ __html: popupRow(SVG.building, suc.tipo_negocio) }} />}
                          {suc.responsable   && <span dangerouslySetInnerHTML={{ __html: popupRow(SVG.user, suc.responsable) }} />}
                          {suc.telefono      && <span dangerouslySetInnerHTML={{ __html: popupRow(SVG.phone, suc.telefono) }} />}
                          {suc.direccion     && <span dangerouslySetInnerHTML={{ __html: popupRow(SVG.pin, suc.direccion) }} />}
                          {suc.dias_visita   && <span dangerouslySetInnerHTML={{ __html: popupRow(SVG.calendar, suc.dias_visita) }} />}
                          {suc.capacidad_refri && <span dangerouslySetInnerHTML={{ __html: popupRow(SVG.fridge, `${suc.capacidad_refri} piezas`) }} />}
                          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 ${e.badgeBg} ${e.badgeText}`}>
                            {e.label}
                          </span>

                          {/* Chart ventas últimos 6 meses */}
                          {ventasMap.get(suc.id) && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e7d8c3' }}>
                              <SucursalMiniChart data={ventasMap.get(suc.id)!} />
                            </div>
                          )}

                          <div className="pt-1">
                            <a
                              href={`https://www.google.com/maps?q=${suc.latitud},${suc.longitud}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-brand-teal hover:text-brand-berry"
                            >
                              Ver en Google Maps
                              <span dangerouslySetInnerHTML={{ __html: SVG.external }} />
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
