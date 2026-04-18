import { useState } from 'react'
import type { VentaMes } from '../../services/dashboard'

function fmtMXN(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `$${Math.round(n)}`
}

function fmtMXNFull(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

interface Props {
  data: VentaMes[]
  height?: number
}

/**
 * Mini bar chart SVG inline — cero deps.
 * Muestra ingresos por mes con hover tooltip + total/promedio arriba.
 */
export default function SucursalMiniChart({ data, height = 60 }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const max = Math.max(...data.map(d => d.ingresos), 1)
  const total = data.reduce((s, d) => s + d.ingresos, 0)
  const pedidosTotal = data.reduce((s, d) => s + d.pedidos, 0)
  const mesActivos = data.filter(d => d.ingresos > 0).length
  const promedio = mesActivos > 0 ? total / mesActivos : 0

  const width = 220
  const barW = width / data.length
  const pad = 2

  return (
    <div style={{ width: '100%' }}>
      {/* Encabezado stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a08977', fontWeight: 800, margin: 0 }}>
            Ventas {data.length} meses
          </p>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#4a2e1a', margin: 0, lineHeight: 1.1 }}>
            {fmtMXNFull(total)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 9, color: '#a08977', fontWeight: 700, margin: 0 }}>{pedidosTotal} pedidos</p>
          <p style={{ fontSize: 10, color: '#0ea5a5', fontWeight: 800, margin: 0 }}>
            prom {fmtMXN(promedio)}/mes
          </p>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${width} ${height + 18}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {data.map((d, i) => {
          const h = (d.ingresos / max) * height
          const x = i * barW + pad
          const y = height - h
          const w = barW - pad * 2
          const isHover = hover === i
          return (
            <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Guía fondo */}
              <rect x={x} y={0} width={w} height={height} fill="#f3ebe0" rx={3} />
              {/* Barra */}
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={isHover ? '#b1306b' : '#ef7a5a'}
                rx={3}
                style={{ transition: 'fill 150ms' }}
              />
              {/* Label mes */}
              <text
                x={x + w / 2}
                y={height + 12}
                textAnchor="middle"
                style={{
                  fontSize: 9,
                  fill: isHover ? '#b1306b' : '#a08977',
                  fontWeight: isHover ? 800 : 700,
                }}
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip hover */}
      {hover !== null && (
        <p style={{ fontSize: 10, color: '#4a2e1a', fontWeight: 700, margin: '4px 0 0', textAlign: 'center' }}>
          <span style={{ color: '#b1306b', fontWeight: 900 }}>{data[hover].label}</span>
          {' · '}
          {fmtMXNFull(data[hover].ingresos)}
          {' · '}
          {data[hover].pedidos} {data[hover].pedidos === 1 ? 'pedido' : 'pedidos'}
        </p>
      )}
    </div>
  )
}
