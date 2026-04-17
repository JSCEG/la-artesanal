import { useEffect, useRef, useState } from 'react'

export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setVisible(true)
            io.disconnect()
          }
        })
      },
      { threshold, rootMargin: '0px 0px -10% 0px' }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, visible }
}
