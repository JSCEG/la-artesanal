import { supabase } from './supabase'

/**
 * PAGOS - Servicio preparado para Stripe, PayPal y métodos locales
 *
 * Estado actual: efectivo / transferencia / mixto (operación interna)
 * Próximas integraciones:
 *   - Stripe: agregar VITE_STRIPE_PUBLIC_KEY en .env.local
 *   - PayPal: agregar VITE_PAYPAL_CLIENT_ID en .env.local
 *
 * Los webhooks de cada gateway deben apuntar a una Edge Function en Supabase:
 *   supabase/functions/webhook-stripe/index.ts
 *   supabase/functions/webhook-paypal/index.ts
 */

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto' | 'stripe' | 'paypal'
export type GatewayStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface CreatePaymentPayload {
  order_id?: string
  profile_id?: string
  amount: number
  method: PaymentMethod
  reference?: string
  // Gateway (online payments)
  gateway?: 'stripe' | 'paypal'
  gateway_id?: string
  gateway_status?: GatewayStatus
  gateway_metadata?: Record<string, unknown>
}

export async function createPayment(payload: CreatePaymentPayload) {
  return supabase.from('payments').insert(payload).select().single()
}

export async function getPaymentsByOrder(orderId: string) {
  return supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('received_at', { ascending: false })
}

export async function getPaymentsByProfile(profileId: string) {
  return supabase
    .from('payments')
    .select('*')
    .eq('profile_id', profileId)
    .order('received_at', { ascending: false })
}

// ─── STRIPE (pendiente de integrar) ───────────────────────────────────────────
// import { loadStripe } from '@stripe/stripe-js'
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
//
// export async function createStripeSession(orderId: string, amount: number) {
//   // Llamar a Edge Function que crea el PaymentIntent
//   const { data, error } = await supabase.functions.invoke('create-stripe-session', {
//     body: { orderId, amount }
//   })
//   return { data, error }
// }

// ─── PAYPAL (pendiente de integrar) ───────────────────────────────────────────
// export async function createPaypalOrder(orderId: string, amount: number) {
//   const { data, error } = await supabase.functions.invoke('create-paypal-order', {
//     body: { orderId, amount }
//   })
//   return { data, error }
// }
