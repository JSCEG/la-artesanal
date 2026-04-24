import { createContext, useContext, useEffect, useState } from 'react'
import type { ProductoCatalogo } from '../services/productos'

export interface CartItem extends ProductoCatalogo {
  cantidad: number
}

interface CartCtx {
  items: CartItem[]
  count: number
  subtotal: number
  add: (p: ProductoCatalogo, qty?: number) => void
  setQty: (id: number, qty: number) => void
  remove: (id: number) => void
  clear: () => void
}

const CartContext = createContext<CartCtx | null>(null)
const STORAGE_KEY = 'la-artesanal-cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
  }, [items])

  function add(p: ProductoCatalogo, qty = 1) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + qty }
        return next
      }
      return [...prev, { ...p, cantidad: qty }]
    })
  }

  function setQty(id: number, qty: number) {
    setItems(prev => qty <= 0
      ? prev.filter(i => i.id !== id)
      : prev.map(i => i.id === id ? { ...i, cantidad: qty } : i))
  }

  function remove(id: number) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function clear() { setItems([]) }

  const count = items.reduce((s, i) => s + i.cantidad, 0)
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio, 0)

  return (
    <CartContext.Provider value={{ items, count, subtotal, add, setQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
