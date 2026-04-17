export type AppRole = 'admin' | 'operador' | 'caja' | 'cliente'
export type CommercialProfile = 'mayorista' | 'minorista'

export interface Profile {
  id: string
  full_name: string
  phone?: string
  role: AppRole
  commercial_profile: CommercialProfile
  organization_name?: string
  is_active: boolean
  created_at: string
}
