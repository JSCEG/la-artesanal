import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import type { Profile, CommercialProfile } from '../types'

interface SessionContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isMayorista: boolean
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>
  signUp: (email: string, password: string, fullName: string, commercialProfile: CommercialProfile) => ReturnType<typeof supabase.auth.signUp>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Carga inicial de sesión
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) fetchProfile(data.session.user.id)
      else setLoading(false)
    })

    // Una sola suscripción para toda la app
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email: string, password: string, fullName: string, commercialProfile: CommercialProfile) =>
    supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, commercial_profile: commercialProfile } },
    })

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
    }
    setSession(null)
    setProfile(null)
    setLoading(false)
  }

  const isAdmin = profile?.role === 'admin'
  const isMayorista = profile?.commercial_profile === 'mayorista'

  return (
    <SessionContext.Provider value={{ session, profile, loading, isAdmin, isMayorista, signIn, signUp, signOut }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSessionContext debe usarse dentro de <SessionProvider>')
  return ctx
}
