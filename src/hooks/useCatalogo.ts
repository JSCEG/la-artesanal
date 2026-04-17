import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { Profile } from '../types'

export interface Producto {
  id: number
  name: string
  category: string
  description: string
  sku: string
  unit: string
  photo_url?: string | null
  precio_minorista?: number
  precio_mayorista?: number
}

export const CATEGORIAS = ['Todos', 'Paletas', 'Nieves', 'Litros', 'Cafe']

export function useCatalogo(profile: Profile | null) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProductos()
  }, [profile?.commercial_profile])

  async function fetchProductos() {
    setLoading(true)

    const { data: products } = await supabase
      .from('products')
      .select('id, name, category, description, sku, unit, photo_url')
      .eq('is_active', true)
      .order('category')

    if (!products) { setLoading(false); return }

    const { data: prices } = await supabase
      .from('product_prices')
      .select('product_id, amount, price_lists(code)')
      .eq('active', true)

    const priceMap: Record<number, { minorista?: number; mayorista?: number }> = {}
    prices?.forEach((p: any) => {
      const code = p.price_lists?.code
      if (!priceMap[p.product_id]) priceMap[p.product_id] = {}
      if (code === 'minorista') priceMap[p.product_id].minorista = p.amount
      if (code === 'mayorista') priceMap[p.product_id].mayorista = p.amount
    })

    setProductos(products.map(p => ({
      ...p,
      precio_minorista: priceMap[p.id]?.minorista,
      precio_mayorista: priceMap[p.id]?.mayorista,
    })))
    setLoading(false)
  }

  return { productos, loading }
}
