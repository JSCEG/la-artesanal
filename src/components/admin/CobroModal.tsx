import { useEffect, useMemo, useState } from 'react'
import { getClientes } from '../../services/clientes'
import type { Cliente, Sucursal } from '../../services/clientes'
import { createCobro, getPedidos, getSaldoCliente } from '../../services/pedidos'
import type { MetodoCobro, Pedido } from '../../services/pedidos'
import { useSession } from '../../hooks/useSession'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  clienteInicial?: string
  pedidoInicial?: Pedido
  onClose: () => void
  onSaved: () => void
}

// ─── Iconos ──────────────────────────────────────────────────────────────────

const ICONS = {
  efectivo: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
    </svg>
  ),
  transferencia: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  tarjeta: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
    </svg>
  ),
  warn: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  check: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  money: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
}

// ─── Métodos ─────────────────────────────────────────────────────────────────

const METODOS: { value: MetodoCobro; label: string; tone: string }[] = [
  { value: 'efectivo',      label: 'Efectivo',      tone: 'teal'  },
  { value: 'transferencia', label: 'Transferencia', tone: 'berry' },
  { value: 'tarjeta',       label: 'Tarjeta',       tone: 'coral' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function CobroModal({ clienteInicial, pedidoInicial, onClose, onSaved }: Props) {
  const { session } = useSession()

  // Maestros
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loadingMaestros, setLoadingMaestros] = useState(true)

  // Form
  const [clienteId, setClienteId] = useState(clienteInicial ?? pedidoInicial?.cliente_id ?? '')
  const [sucursalId, setSucursalId] = useState<string>(pedidoInicial?.sucursal_id ?? '')
  const [pedidoId, setPedidoId] = useState<string>(pedidoInicial?.id ?? '')
  const [monto, setMonto] = useState<number>(0)
  const [metodo, setMetodo] = useState<MetodoCobro>('efectivo')
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')

  // Saldo del cliente
  const [saldo, setSaldo] = useState<{ total_pedidos: number; total_cobrado: number; saldo: number } | null>(null)
  const [loadingSaldo, setLoadingSaldo] = useState(false)

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ─── Cargar maestros ─────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getClientes(), getPedidos()]).then(([cs, ps]) => {
      setClientes(cs)
      setPedidos(ps.filter(p => p.estatus !== 'cancelado' && p.estatus !== 'borrador'))
      setLoadingMaestros(false)
    })
  }, [])

  // ─── Cargar saldo cuando cambia el cliente ────────────────────────────────
  useEffect(() => {
    if (!clienteId) { setSaldo(null); return }
    setLoadingSaldo(true)
    getSaldoCliente(clienteId)
      .then(setSaldo)
      .finally(() => setLoadingSaldo(false))
  }, [clienteId])

  // ─── Auto-sugerir monto igual al saldo pendiente ──────────────────────────
  useEffect(() => {
    if (saldo && monto === 0) {
      setMonto(Math.max(0, saldo.saldo))
    }
  }, [saldo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed ─────────────────────────────────────────────────────────────
  const clienteSeleccionado = useMemo(
    () => clientes.find(c => c.id === clienteId),
    [clientes, clienteId],
  )

  const sucursalesCliente: Sucursal[] = useMemo(
    () => clienteSeleccionado?.sucursales ?? [],
    [clienteSeleccionado],
  )

  const pedidosCliente = useMemo(
    () => pedidos.filter(p => p.cliente_id === clienteId),
    [pedidos, clienteId],
  )

  const requiereRef = metodo !== 'efectivo'
  const saldoNuevo = saldo ? saldo.saldo - monto : 0

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (monto <= 0)  { setError('El monto debe ser mayor a 0'); return }

    setSaving(true)
    setError('')

    const { error: errCobro } = await createCobro({
      cliente_id: clienteId,
      sucursal_id: sucursalId || null,
      pedido_id: pedidoId || null,
      monto,
      metodo,
      referencia,
      notas,
      createdBy: session!.user.id,
    })

    if (errCobro) {
      setSaving(false)
      setError('Error al registrar el cobro. Intenta de nuevo.')
      return
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[94vh] flex flex-col border border-white/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-wood/10 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-brand-wood">Registrar cobro</h2>
            <p className="text-xs text-brand-wood-soft font-medium mt-0.5">Captura un pago o abono a cuenta del cliente</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-cream/60 text-brand-wood-soft hover:text-brand-berry transition-colors">
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Cliente */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Cliente *</label>
              {loadingMaestros ? (
                <div className="input w-full animate-pulse bg-brand-cream/60 h-11" />
              ) : (
                <select
                  value={clienteId}
                  onChange={e => { setClienteId(e.target.value); setSucursalId(''); setPedidoId(''); setMonto(0) }}
                  className="input w-full"
                  required
                >
                  <option value="">— Selecciona cliente —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_comercial} ({c.tipo})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Saldo del cliente */}
            {clienteId && (
              <div className={`rounded-2xl px-4 py-3 border-2 ${
                loadingSaldo
                  ? 'bg-brand-cream/40 border-brand-wood/10 animate-pulse'
                  : saldo && saldo.saldo > 0
                    ? 'bg-gradient-to-br from-brand-coral/10 to-brand-coral/5 border-brand-coral/25'
                    : 'bg-gradient-to-br from-brand-teal/10 to-brand-teal/5 border-brand-teal/25'
              }`}>
                {loadingSaldo ? (
                  <p className="text-xs text-brand-wood-soft font-medium">Calculando saldo…</p>
                ) : saldo ? (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Saldo del cliente</p>
                      <p className="text-xs text-brand-wood-soft mt-0.5">
                        {fmt(saldo.total_cobrado)} cobrado de {fmt(saldo.total_pedidos)}
                      </p>
                    </div>
                    <p className={`font-display text-2xl font-black ${saldo.saldo > 0 ? 'text-brand-coral' : 'text-brand-teal'}`}>
                      {fmt(saldo.saldo)}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Sucursal (opcional) */}
            {sucursalesCliente.length > 0 && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Sucursal</label>
                <select
                  value={sucursalId}
                  onChange={e => setSucursalId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">— Sin sucursal específica —</option>
                  {sucursalesCliente.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre_sucursal}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Pedido (opcional) */}
            {clienteId && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Pedido (opcional)</label>
                {pedidosCliente.length === 0 ? (
                  <p className="text-xs text-brand-wood-soft italic">Este cliente no tiene pedidos activos para asignar.</p>
                ) : (
                  <select
                    value={pedidoId}
                    onChange={e => setPedidoId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">— Abono a cuenta (sin pedido específico) —</option>
                    {pedidosCliente.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fecha_pedido} — {p.sucursal?.nombre_sucursal ?? 'sin sucursal'} — {p.estatus}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Monto */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Monto *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-black text-brand-wood-soft pointer-events-none select-none">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={monto || ''}
                  onChange={e => setMonto(Number(e.target.value))}
                  placeholder="0"
                  className="input w-full !pl-10 font-display text-xl font-black tracking-tight"
                  required
                />
              </div>
              {saldo && monto > 0 && (
                <p className={`text-xs mt-1.5 font-medium ${
                  saldoNuevo > 0 ? 'text-brand-coral'
                  : saldoNuevo === 0 ? 'text-brand-teal'
                  : 'text-brand-wood-soft'
                }`}>
                  {saldoNuevo > 0
                    ? `Quedará ${fmt(saldoNuevo)} en cuentas por cobrar`
                    : saldoNuevo === 0
                      ? '✓ El cliente quedará al corriente'
                      : `Excede en ${fmt(Math.abs(saldoNuevo))} al saldo actual — quedará saldo a favor`}
                </p>
              )}
            </div>

            {/* Método */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Método *</label>
              <div className="grid grid-cols-3 gap-2">
                {METODOS.map(m => {
                  const active = metodo === m.value
                  const toneRing =
                    m.tone === 'teal'  ? (active ? 'bg-brand-teal/10 border-brand-teal/40 text-brand-teal ring-2 ring-brand-teal/25' : '')
                  : m.tone === 'berry' ? (active ? 'bg-brand-berry/10 border-brand-berry/40 text-brand-berry ring-2 ring-brand-berry/25' : '')
                  :                      (active ? 'bg-brand-coral/15 border-brand-coral/40 text-brand-coral ring-2 ring-brand-coral/25' : '')
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMetodo(m.value)}
                      className={`rounded-xl border-2 px-3 py-2.5 flex flex-col items-center justify-center gap-1 font-bold text-[11px] uppercase tracking-widest transition-all ${
                        active ? toneRing : 'bg-white border-brand-wood/15 text-brand-wood hover:border-brand-wood/30'
                      }`}
                    >
                      {ICONS[m.value as keyof typeof ICONS]}
                      <span>{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Referencia (si no es efectivo) */}
            {requiereRef && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">
                  Referencia {metodo === 'transferencia' ? '(núm. operación)' : '(terminación tarjeta)'}
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  placeholder={metodo === 'transferencia' ? 'Ej. 1234567890' : 'Ej. **** 4532'}
                  className="input w-full"
                />
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-wood/70 mb-1.5">Notas</label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Observaciones del cobro…"
                rows={2}
                className="input w-full resize-none"
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
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-wood/15 text-brand-wood font-black text-[11px] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !clienteId || monto <= 0}
              className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  {ICONS.money}
                  Registrar cobro {monto > 0 && `· ${fmt(monto)}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
