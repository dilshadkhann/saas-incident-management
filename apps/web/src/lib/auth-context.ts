import { createContext } from 'react'

export type User = {
  id: string
  name: string
  email: string
  created_at: string
}

export type Organization = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export type Role = 'admin' | 'responder' | 'viewer'

export type Membership = {
  user_id: string
  role: Role
}

export type AuthContextValue = {
  user: User | null
  organizations: Organization[]
  organization: Organization | null
  role: Role | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  selectOrganization: (id: string) => void
  createOrganization: (name: string) => Promise<Organization>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
