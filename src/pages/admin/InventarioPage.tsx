import ComingSoon from '../../components/admin/ComingSoon'

const ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.29 7 12 12 20.71 7"/>
    <line x1="12" x2="12" y1="22" y2="12"/>
  </svg>
)

export default function InventarioPage() {
  return (
    <ComingSoon
      tone="wood"
      eyebrow="Módulo operativo"
      title="Inventario"
      description="Control de existencias por producto, insumos, lotes y ubicaciones. Alertas de stock crítico y movimientos automáticos con pedidos y producción."
      eta="FASE 1C · Segundo release"
      icon={ICON}
      features={[
        {
          label: 'Existencias por producto',
          hint: 'Stock actual, reservado (en pedidos) y disponible para vender.',
        },
        {
          label: 'Insumos y materias primas',
          hint: 'Frutas, lácteos, empaques — con unidad y proveedor.',
        },
        {
          label: 'Movimientos automáticos',
          hint: 'Entradas por producción, salidas al confirmar pedidos o entregar.',
        },
        {
          label: 'Alertas de stock crítico',
          hint: 'Umbrales configurables por producto — notificación en Dashboard.',
        },
        {
          label: 'Ajustes manuales con motivo',
          hint: 'Mermas, caducidades, regalos — registro auditable.',
        },
        {
          label: 'Producción (recetas)',
          hint: 'Convierte insumos en productos terminados con una receta base.',
        },
        {
          label: 'Kardex por producto',
          hint: 'Historial cronológico de entradas y salidas con costo promedio.',
        },
      ]}
    />
  )
}
