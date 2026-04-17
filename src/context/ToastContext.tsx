import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  show: (message: string, kind?: ToastKind, durationMs?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

const KIND_STYLES: Record<ToastKind, { bar: string; icon: ReactNode; text: string }> = {
  success: {
    bar: 'from-brand-teal to-brand-teal-soft',
    text: 'text-brand-teal',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  },
  error: {
    bar: 'from-brand-coral to-brand-berry',
    text: 'text-brand-berry',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>,
  },
  info: {
    bar: 'from-brand-berry to-brand-berry-soft',
    text: 'text-brand-berry',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message: string, kind: ToastKind = 'info', durationMs = 3600) => {
    const id = ++idRef.current
    setToasts(ts => [...ts, { id, kind, message }])
    window.setTimeout(() => dismiss(id), durationMs)
  }, [dismiss])

  const api: ToastApi = {
    show,
    success: m => show(m, 'success'),
    error: m => show(m, 'error'),
    info: m => show(m, 'info'),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Viewport */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0 z-[10000] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map(t => {
          const s = KIND_STYLES[t.kind]
          return (
            <div key={t.id}
              className="pointer-events-auto overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-brand-wood/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] animate-toast-in flex">
              <div className={`w-1.5 bg-gradient-to-b ${s.bar}`} />
              <div className="flex-1 flex items-center gap-3 p-3 pr-2">
                <span className={`shrink-0 ${s.text}`}>{s.icon}</span>
                <p className="text-sm font-semibold text-brand-wood leading-snug flex-1">{t.message}</p>
                <button onClick={() => dismiss(t.id)}
                  aria-label="Cerrar"
                  className="shrink-0 w-7 h-7 rounded-full hover:bg-brand-wood/10 flex items-center justify-center text-brand-wood/60 hover:text-brand-wood transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
