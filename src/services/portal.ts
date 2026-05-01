import { supabase } from './supabase'
import type { Cliente } from './clientes'
import { getSaldoCliente } from './pedidos'

// Resuelve cliente vinculado al email de la sesión
export async function getMiCliente(): Promise<Cliente | null> {
  const { data: auth } = await supabase.auth.getUser()
  const email = auth?.user?.email
  if (!email) return null

  // La función get_cliente_id_by_email existe en DB
  const { data: id, error } = await supabase.rpc('get_cliente_id_by_email', { user_email: email })
  if (error || !id) return null

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return (cliente as Cliente | null) ?? null
}

export async function getMiSaldo(): Promise<{
  cliente: Cliente | null
  total_pedidos: number
  total_cobrado: number
  saldo: number
} | null> {
  const cliente = await getMiCliente()
  if (!cliente) return null
  const saldo = await getSaldoCliente(cliente.id)
  return { cliente, ...saldo }
}
