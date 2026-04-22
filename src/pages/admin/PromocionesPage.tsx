import { useEffect, useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { useToast } from '../../context/ToastContext'
import {
  getPromociones,
  upsertPromocion,
  deletePromocion,
  togglePromoActivo,
} from '../../services/promociones'
import type { Promocion, PromocionFormData, TipoPromo, AplicaA } from '../../services/promociones'

function emptyForm(): PromocionFormData {
  return {
    codigo: '',
    descripcion: '',
    tipo: 'porcentaje',
    valor: 10,
    aplica_a: 'todos',
    vigente_desde: null,
    vigente_hasta: null,
    uso_max: null,
    activo: true,
  }
}

export default function PromocionesPage() {
  const { session } = useSession()
  const toast = useToast()
  const [items, setItems] = useState<Promocion[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<PromocionFormData>(emptyForm())
  const [saving, setSaving] = useState(false)

  async function refresh() {
    setLoading(true)
    setItems(await getPromociones())
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  function openNew() {
    setEditId(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(p: Promocion) {
    setEditId(p.id)
    setForm({
      codigo: p.codigo,
      descripcion: p.descripcion ?? '',
      tipo: p.tipo,
      valor: p.valor,
      aplica_a: p.aplica_a,
      vigente_desde: p.vigente_desde,
      vigente_hasta: p.vigente_hasta,
      uso_max: p.uso_max,
      activo: p.activo,
    })
    setOpen(true)
  }

  async function save() {
    if (!form.codigo.trim()) { toast.error('Código requerido'); return }
    if (form.valor <= 0) { toast.error('Valor debe ser > 0'); return }
    setSaving(true)
    const { error } = await upsertPromocion(form, editId ?? undefined, session?.user.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(editId ? 'Promoción actualizada' : 'Promoción creada')
    setOpen(false)
    refresh()
  }

  async function remove(p: Promocion) {
    if (!confirm(`¿Eliminar "${p.codigo}"?`)) return
    const { error } = await deletePromocion(p.id)
    if (error) { toast.error(error.message); return }
    toast.success('Eliminada')
    refresh()
  }

  async function toggle(p: Promocion) {
    await togglePromoActivo(p.id, !p.activo)
    refresh()
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-brand-wood">Promociones</h1>
          <p className="text-xs text-brand-wood-soft font-medium mt-1">Códigos de descuento aplicables a pedidos</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Nueva</button>
      </div>

      <div className="bg-white rounded-2xl border border-brand-wood/10 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-brand-wood-soft">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-brand-wood-soft">Sin promociones. Crea la primera.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-cream/40 text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">
              <tr>
                <th className="text-left px-4 py-2">Código</th>
                <th className="text-left px-4 py-2">Tipo</th>
                <th className="text-left px-4 py-2">Valor</th>
                <th className="text-left px-4 py-2">Aplica</th>
                <th className="text-left px-4 py-2">Vigencia</th>
                <th className="text-left px-4 py-2">Usos</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-t border-brand-wood/5">
                  <td className="px-4 py-2">
                    <p className="font-black text-brand-wood">{p.codigo}</p>
                    {p.descripcion && <p className="text-xs text-brand-wood-soft">{p.descripcion}</p>}
                  </td>
                  <td className="px-4 py-2">{p.tipo === 'porcentaje' ? '%' : '$'}</td>
                  <td className="px-4 py-2 font-bold">{p.tipo === 'porcentaje' ? `${p.valor}%` : `$${p.valor}`}</td>
                  <td className="px-4 py-2 capitalize">{p.aplica_a}</td>
                  <td className="px-4 py-2 text-xs text-brand-wood-soft">
                    {p.vigente_desde ?? '—'} → {p.vigente_hasta ?? '∞'}
                  </td>
                  <td className="px-4 py-2 text-xs">{p.usos}{p.uso_max ? ` / ${p.uso_max}` : ''}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => toggle(p)} className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${p.activo ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' : 'bg-brand-wood/5 text-brand-wood-soft border-brand-wood/15'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="text-xs font-black text-brand-teal hover:underline">Editar</button>
                    <button onClick={() => remove(p)} className="text-xs font-black text-brand-berry hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-brand-wood/10 flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-black text-brand-wood">
                {editId ? 'Editar promoción' : 'Nueva promoción'}
              </h2>
              <button onClick={() => setOpen(false)} className="text-brand-wood-soft hover:text-brand-wood text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Código *</label>
                <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} className="input w-full mt-1" placeholder="VERANO10" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Descripción</label>
                <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="input w-full mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoPromo })} className="input w-full mt-1">
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto_fijo">Monto fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Valor *</label>
                  <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: Number(e.target.value) })} className="input w-full mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Aplica a</label>
                <select value={form.aplica_a} onChange={e => setForm({ ...form, aplica_a: e.target.value as AplicaA })} className="input w-full mt-1">
                  <option value="todos">Todos</option>
                  <option value="minorista">Sólo minorista</option>
                  <option value="mayorista">Sólo mayorista</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Vigente desde</label>
                  <input type="date" value={form.vigente_desde ?? ''} onChange={e => setForm({ ...form, vigente_desde: e.target.value || null })} className="input w-full mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Vigente hasta</label>
                  <input type="date" value={form.vigente_hasta ?? ''} onChange={e => setForm({ ...form, vigente_hasta: e.target.value || null })} className="input w-full mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-wood-soft">Uso máximo (opcional)</label>
                <input type="number" min="1" value={form.uso_max ?? ''} onChange={e => setForm({ ...form, uso_max: e.target.value ? Number(e.target.value) : null })} className="input w-full mt-1" placeholder="Ilimitado" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
                <span className="text-sm font-bold text-brand-wood">Activo</span>
              </label>
            </div>

            <div className="p-4 border-t border-brand-wood/10 flex gap-2 bg-brand-cream/30">
              <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
