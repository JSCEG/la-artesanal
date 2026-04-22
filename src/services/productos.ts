import { supabase } from './supabase'

export const CATEGORIAS_PRODUCTO = ['Paletas', 'Nieves', 'Litros', 'Cafe'] as const
export const UNIDADES = ['pieza', 'vaso', 'litro', 'taza'] as const

export type CategoriaProducto = typeof CATEGORIAS_PRODUCTO[number]
export type Unidad = typeof UNIDADES[number]

export interface ProductoConPrecios {
  id: number
  name: string
  category: string
  description: string | null
  sku: string | null
  unit: string
  is_active: boolean
  photo_url: string | null
  created_at: string
  precio_minorista?: number
  precio_mayorista?: number
  price_list_minorista_id?: string
  price_list_mayorista_id?: string
  precio_minorista_row_id?: string
  precio_mayorista_row_id?: string
}

export interface ProductoFormData {
  name: string
  category: string
  description: string
  sku: string
  unit: string
  is_active: boolean
  precio_minorista: number | null
  precio_mayorista: number | null
  photo_url: string | null
}

export async function uploadProductPhoto(file: File, productId: number | string): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${productId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

export async function getProductosAdmin(): Promise<ProductoConPrecios[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error || !products) return []

  const { data: prices } = await supabase
    .from('product_prices')
    .select('id, product_id, amount, price_list_id, price_lists(code, id)')
    .eq('active', true)

  const { data: priceLists } = await supabase
    .from('price_lists')
    .select('id, code')

  const plMap: Record<string, string> = {}
  priceLists?.forEach((pl: any) => { plMap[pl.code] = pl.id })

  const priceMap: Record<number, Partial<ProductoConPrecios>> = {}
  prices?.forEach((p: any) => {
    const code = p.price_lists?.code
    if (!priceMap[p.product_id]) priceMap[p.product_id] = {}
    if (code === 'minorista') {
      priceMap[p.product_id].precio_minorista = p.amount
      priceMap[p.product_id].precio_minorista_row_id = p.id
      priceMap[p.product_id].price_list_minorista_id = plMap['minorista']
    }
    if (code === 'mayorista') {
      priceMap[p.product_id].precio_mayorista = p.amount
      priceMap[p.product_id].precio_mayorista_row_id = p.id
      priceMap[p.product_id].price_list_mayorista_id = plMap['mayorista']
    }
  })

  return products.map(p => ({ ...p, ...priceMap[p.id] }))
}

export async function getPriceLists() {
  return supabase.from('price_lists').select('id, code, name').eq('is_active', true)
}

export async function upsertProducto(
  data: ProductoFormData,
  existingId?: number
): Promise<{ error: string | null; id: number | null }> {

  const { data: priceLists } = await getPriceLists()
  const plMinorista = priceLists?.find((pl: any) => pl.code === 'minorista')
  const plMayorista = priceLists?.find((pl: any) => pl.code === 'mayorista')

  // Upsert producto
  const productPayload = {
    name: data.name,
    category: data.category,
    description: data.description || null,
    sku: data.sku || null,
    unit: data.unit,
    is_active: data.is_active,
    photo_url: data.photo_url || null,
  }

  let productId = existingId
  if (existingId) {
    const { error } = await supabase.from('products').update(productPayload).eq('id', existingId)
    if (error) return { error: error.message, id: null }
  } else {
    const { data: created, error } = await supabase.from('products').insert(productPayload).select('id').single()
    if (error || !created) return { error: error?.message ?? 'Error al crear', id: null }
    productId = created.id
  }

  // Upsert precios
  if (productId && plMinorista && data.precio_minorista !== null) {
    await supabase.from('product_prices').upsert({
      product_id: productId,
      price_list_id: plMinorista.id,
      amount: data.precio_minorista,
      active: true,
      valid_from: new Date().toISOString().split('T')[0],
    }, { onConflict: 'product_id,price_list_id,valid_from' })
  }
  if (productId && plMayorista && data.precio_mayorista !== null) {
    await supabase.from('product_prices').upsert({
      product_id: productId,
      price_list_id: plMayorista.id,
      amount: data.precio_mayorista,
      active: true,
      valid_from: new Date().toISOString().split('T')[0],
    }, { onConflict: 'product_id,price_list_id,valid_from' })
  }

  return { error: null, id: productId ?? null }
}

export async function toggleProductoActivo(id: number, is_active: boolean) {
  return supabase.from('products').update({ is_active }).eq('id', id)
}

export interface ProductoCatalogo {
  id: number
  name: string
  category: string
  unit: string
  photo_url: string | null
  precio: number
}

export async function getCatalogoPorLista(listCode: 'minorista' | 'mayorista'): Promise<ProductoCatalogo[]> {
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, unit, photo_url')
    .eq('is_active', true)
    .order('category')
    .order('name')
  if (!products) return []

  const { data: list } = await supabase
    .from('price_lists')
    .select('id')
    .eq('code', listCode)
    .eq('is_active', true)
    .maybeSingle()
  if (!list) return []

  const { data: prices } = await supabase
    .from('product_prices')
    .select('product_id, amount')
    .eq('price_list_id', list.id)
    .eq('active', true)

  const priceMap = new Map((prices ?? []).map(p => [p.product_id, Number(p.amount)]))
  return products
    .filter(p => priceMap.has(p.id))
    .map(p => ({ ...p, precio: priceMap.get(p.id) ?? 0 }))
}
