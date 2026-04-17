import ComingSoon from '../../components/admin/ComingSoon'

const ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

export default function CobrosPage() {
  return (
    <ComingSoon
      tone="coral"
      eyebrow="Módulo financiero"
      title="Cobros"
      description="Registra pagos de clientes mayoristas y minoristas, métodos múltiples (efectivo, transferencia, tarjeta) y concilia contra pedidos y entregas."
      eta="FASE 1C · Próximo release"
      icon={ICON}
      features={[
        {
          label: 'Registrar pagos parciales o totales',
          hint: 'Con asignación automática al pedido/entrega correspondiente.',
        },
        {
          label: 'Múltiples métodos de pago',
          hint: 'Efectivo, transferencia, tarjeta, vale — con referencia opcional.',
        },
        {
          label: 'Estado de cuenta por cliente',
          hint: 'Saldo pendiente, historial de pagos y notificaciones de vencimiento.',
        },
        {
          label: 'Cuentas por cobrar (CxC)',
          hint: 'Reporte de antigüedad de saldos: al día, 7d, 15d, 30d+.',
        },
        {
          label: 'Recordatorios por WhatsApp',
          hint: 'Plantilla pre-cargada con saldo y enlace al estado de cuenta.',
        },
        {
          label: 'Conciliación con entregas',
          hint: 'Detecta entregas sin cobro y pagos sin asignar.',
        },
      ]}
    />
  )
}
