import { useEffect, useState } from 'react'
import { getClientes, deleteCliente, deleteSucursal } from '../../services/clientes'
import type { Cliente, Sucursal } from '../../services/clientes'
import { getSaldoCliente } from '../../services/pedidos'
import ClienteModal from '../../components/admin/ClienteModal'
import SucursalModal from '../../components/admin/SucursalModal'
import { CardSkeleton } from '../../components/admin/Skeleton'
import EmptyState from '../../components/admin/EmptyState'
import { useToast } from '../../context/ToastContext'

const TIPO_BADGE: Record<string, string> = {
  mayorista: 'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
  minorista: 'bg-brand-berry/10 text-brand-berry border-brand-berry/30',
  evento:    'bg-brand-coral/15 text-brand-coral border-brand-coral/30',
}

const ESTATUS_COLOR: Record<string, string> = {
  activo:   'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
  pausado:  'bg-brand-coral/15 text-brand-coral border-brand-coral/30',
  inactivo: 'bg-brand-wood/5 text-brand-wood-soft border-brand-wood/15',
}

const ICON_PHONE = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
)
const ICON_CREDIT = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
)
const ICON_PIN = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
)
const ICON_STORE = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-2-1a2.7 2.7 0 0 1-2 1a2.7 2.7 0 0 1-2-1a2.7 2.7 0 0 1-2 1a2.7 2.7 0 0 1-2-1a2.7 2.7 0 0 1-2 1a2.7 2.7 0 0 1-2-1a2.7 2.7 0 0 1-2 1a2 2 0 0 1-2-2V7"/></svg>
)

type ConfirmDelete = { tipo: 'cliente' | 'sucursal'; id: string; nombre: string }
type Saldo = { total_pedidos: number; total_cobrado: number; saldo: number }

const fmtMoney = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [saldos, setSaldos] = useState<Record<string, Saldo>>({})
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [clienteModal, setClienteModal] = useState<{ open: boolean; cliente?: Cliente | null }>({ open: false })
  const [sucursalModal, setSucursalModal] = useState<{ open: boolean; clienteId?: string; clienteNombre?: string; sucursal?: Sucursal | null }>({ open: false })
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    try {
      const list = await getClientes()
      setClientes(list)
      // Fetch saldos en paralelo (no bloqueante de UI)
      Promise.all(list.map(c => getSaldoCliente(c.id).then(s => [c.id, s] as const)))
        .then(pairs => setSaldos(Object.fromEntries(pairs)))
        .catch(() => { /* silencio: saldos opcionales */ })
    } catch {
      toast.error('No se pudieron cargar los clientes')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      if (confirmDelete.tipo === 'cliente') {
        await deleteCliente(confirmDelete.id)
        toast.success(`Cliente "${confirmDelete.nombre}" eliminado`)
      } else {
        await deleteSucursal(confirmDelete.id)
        toast.success(`Sucursal "${confirmDelete.nombre}" eliminada`)
      }
      setConfirmDelete(null)
      fetchClientes()
    } catch {
      toast.error('No se pudo eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const filtrados = clientes.filter(c =>
    c.nombre_comercial.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.contacto_principal ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const hayFiltro = busqueda.trim() !== ''

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Clientes</h1>
          <p className="text-sm text-brand-wood-soft font-medium mt-1">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={() => setClienteModal({ open: true, cliente: null })}
          className="btn-primary text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Nuevo cliente
        </button>
      </div>

      {/* Búsqueda */}
      <input type="text" placeholder="Buscar cliente o contacto..."
        value={busqueda} onChange={e => setBusqueda(e.target.value)}
        className="input w-full" />

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          tone="teal"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          title={hayFiltro ? 'Sin resultados' : 'Aún no hay clientes'}
          description={hayFiltro
            ? 'Probá con otro término para encontrar un cliente.'
            : 'Dá de alta tu primer cliente para empezar a registrar pedidos y sucursales.'}
          action={hayFiltro ? (
            <button onClick={() => setBusqueda('')} className="btn-secondary text-sm">Limpiar búsqueda</button>
          ) : (
            <button onClick={() => setClienteModal({ open: true, cliente: null })} className="btn-primary text-sm">
              Crear primer cliente
            </button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtrados.map(cliente => (
            <div key={cliente.id} className="bg-white rounded-2xl border border-brand-wood/10 shadow-[0_4px_20px_rgba(177,48,107,0.04)] overflow-hidden">

              {/* Fila del cliente */}
              <div className="p-4 flex items-center gap-3">
                <button onClick={() => setExpandido(expandido === cliente.id ? null : cliente.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-cream/60 text-brand-wood-soft transition-all flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg"
                       className={`w-4 h-4 transition-transform ${expandido === cliente.id ? 'rotate-90' : ''}`}
                       viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-brand-wood truncate">{cliente.nombre_comercial}</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 border ${TIPO_BADGE[cliente.tipo]}`}>
                      {cliente.tipo}
                    </span>
                    {!cliente.activo && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-brand-wood/5 text-brand-wood-soft border border-brand-wood/15 px-2 py-0.5 rounded-full">inactivo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-brand-wood-soft flex-wrap">
                    {cliente.contacto_principal && <span className="font-medium">{cliente.contacto_principal}</span>}
                    {cliente.telefono && <span className="inline-flex items-center gap-1">{ICON_PHONE}{cliente.telefono}</span>}
                    {cliente.maneja_credito && (
                      <span className="inline-flex items-center gap-1 text-brand-teal font-bold">
                        {ICON_CREDIT} Crédito: ${cliente.limite_credito.toLocaleString()}
                      </span>
                    )}
                    {(() => {
                      const s = saldos[cliente.id]
                      if (!s) return null
                      if (s.saldo <= 0) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-brand-teal/10 text-brand-teal border border-brand-teal/30 px-2 py-0.5 rounded-full">
                            Al día
                          </span>
                        )
                      }
                      const excede = cliente.maneja_credito && s.saldo > cliente.limite_credito
                      return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          excede
                            ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/30'
                            : 'bg-brand-coral/15 text-brand-coral border-brand-coral/30'
                        }`}>
                          Debe {fmtMoney(s.saldo)}
                        </span>
                      )
                    })()}
                    <span className="text-brand-wood/50">
                      {cliente.sucursales?.length ?? 0} {(cliente.sucursales?.length ?? 0) === 1 ? 'sucursal' : 'sucursales'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setSucursalModal({ open: true, clienteId: cliente.id, clienteNombre: cliente.nombre_comercial, sucursal: null })}
                    className="text-xs text-brand-teal font-bold hover:opacity-70 hidden sm:block">
                    + Sucursal
                  </button>
                  <button onClick={() => setClienteModal({ open: true, cliente })}
                    className="text-xs text-brand-berry font-black uppercase tracking-wide hover:opacity-70">
                    Editar
                  </button>
                  {confirmDelete?.id === cliente.id && confirmDelete.tipo === 'cliente' ? (
                    <span className="flex items-center gap-1">
                      <button onClick={handleDelete} disabled={deleting}
                        className="text-[10px] bg-brand-berry text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-90 disabled:opacity-50">
                        {deleting ? '...' : 'Sí'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="text-[10px] text-brand-wood-soft font-black uppercase tracking-widest hover:text-brand-wood">
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete({ tipo: 'cliente', id: cliente.id, nombre: cliente.nombre_comercial })}
                      aria-label="Eliminar cliente"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-wood/30 hover:text-brand-berry hover:bg-brand-berry/5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Sucursales expandidas */}
              {expandido === cliente.id && (
                <div className="border-t border-brand-wood/5 bg-brand-cream/20">
                  {/* Resumen financiero */}
                  {saldos[cliente.id] && (
                    <div className="px-4 py-3 border-b border-brand-wood/5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white border border-brand-wood/10 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-wood-soft">Pedidos</p>
                        <p className="font-display text-base font-black text-brand-wood mt-0.5">{fmtMoney(saldos[cliente.id].total_pedidos)}</p>
                      </div>
                      <div className="rounded-xl bg-white border border-brand-wood/10 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-wood-soft">Cobrado</p>
                        <p className="font-display text-base font-black text-brand-teal mt-0.5">{fmtMoney(saldos[cliente.id].total_cobrado)}</p>
                      </div>
                      <div className={`rounded-xl px-3 py-2 border ${
                        saldos[cliente.id].saldo <= 0
                          ? 'bg-brand-teal/5 border-brand-teal/25'
                          : (cliente.maneja_credito && saldos[cliente.id].saldo > cliente.limite_credito)
                            ? 'bg-brand-berry/10 border-brand-berry/30'
                            : 'bg-brand-coral/10 border-brand-coral/30'
                      }`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-wood-soft">Saldo</p>
                        <p className={`font-display text-base font-black mt-0.5 ${
                          saldos[cliente.id].saldo <= 0
                            ? 'text-brand-teal'
                            : (cliente.maneja_credito && saldos[cliente.id].saldo > cliente.limite_credito)
                              ? 'text-brand-berry'
                              : 'text-brand-coral'
                        }`}>{fmtMoney(Math.max(0, saldos[cliente.id].saldo))}</p>
                      </div>
                    </div>
                  )}
                  {(cliente.sucursales?.length ?? 0) === 0 ? (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs text-brand-wood-soft mb-2">Sin sucursales registradas</p>
                      <button onClick={() => setSucursalModal({ open: true, clienteId: cliente.id, clienteNombre: cliente.nombre_comercial, sucursal: null })}
                        className="text-xs text-brand-berry font-black uppercase tracking-wide">
                        + Agregar primera sucursal
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-brand-wood/5">
                      {cliente.sucursales?.map(suc => (
                        <div key={suc.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-teal to-brand-teal-soft text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                            {ICON_STORE}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-brand-wood truncate">{suc.nombre_sucursal}</p>
                            <div className="flex items-center gap-2 text-xs text-brand-wood-soft mt-0.5 flex-wrap">
                              {suc.tipo_negocio && <span>{suc.tipo_negocio}</span>}
                              {suc.responsable && <span>· {suc.responsable}</span>}
                              {suc.latitud && <span className="inline-flex items-center gap-1 text-brand-teal font-bold">· {ICON_PIN} En mapa</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[suc.estatus]}`}>
                              {suc.estatus}
                            </span>
                            <button onClick={() => setSucursalModal({ open: true, clienteId: cliente.id, clienteNombre: cliente.nombre_comercial, sucursal: suc })}
                              className="text-xs text-brand-berry font-black uppercase tracking-wide hover:opacity-70">
                              Editar
                            </button>
                            {confirmDelete?.id === suc.id && confirmDelete.tipo === 'sucursal' ? (
                              <span className="flex items-center gap-1">
                                <button onClick={handleDelete} disabled={deleting}
                                  className="text-[10px] bg-brand-berry text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-90 disabled:opacity-50">
                                  {deleting ? '...' : 'Sí'}
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="text-[10px] text-brand-wood-soft font-black uppercase tracking-widest hover:text-brand-wood">
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete({ tipo: 'sucursal', id: suc.id, nombre: suc.nombre_sucursal })}
                                aria-label="Eliminar sucursal"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-wood/30 hover:text-brand-berry hover:bg-brand-berry/5 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-2">
                        <button onClick={() => setSucursalModal({ open: true, clienteId: cliente.id, clienteNombre: cliente.nombre_comercial, sucursal: null })}
                          className="text-xs text-brand-teal font-black uppercase tracking-wide hover:opacity-70">
                          + Nueva sucursal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {clienteModal.open && (
        <ClienteModal
          cliente={clienteModal.cliente}
          onClose={() => setClienteModal({ open: false })}
          onSaved={() => { setClienteModal({ open: false }); toast.success('Cliente guardado'); fetchClientes() }}
        />
      )}
      {sucursalModal.open && sucursalModal.clienteId && (
        <SucursalModal
          clienteId={sucursalModal.clienteId}
          clienteNombre={sucursalModal.clienteNombre ?? ''}
          sucursal={sucursalModal.sucursal}
          onClose={() => setSucursalModal({ open: false })}
          onSaved={() => { setSucursalModal({ open: false }); toast.success('Sucursal guardada'); fetchClientes() }}
        />
      )}
    </div>
  )
}
