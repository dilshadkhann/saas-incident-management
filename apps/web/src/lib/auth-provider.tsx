import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, apiRequest } from './api-client'
import {
  AuthContext,
  type AuthContextValue,
  type Membership,
  type Organization,
  type Role,
  type User,
} from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  const organizationIdRef = useRef('')
  const membershipRequestRef = useRef(0)
  // Identifies the most recent refresh(). Refreshes can overlap (React StrictMode runs the mount
  // effect twice, and login/organization creation can refresh while another is in flight). Only
  // the latest one may write state; an older one stops quietly so it can never flip `loading`
  // to false while the newest refresh is still waiting on the user's role.
  const refreshRequestRef = useRef(0)

  const refresh = useCallback(async () => {
    const refreshId = ++refreshRequestRef.current
    const isStale = () => refreshId !== refreshRequestRef.current

    try {
      const currentUser = await apiRequest<User>('/auth/me')
      if (isStale()) return
      setUser(currentUser)

      const orgs = await apiRequest<Organization[]>('/organizations')
      if (isStale()) return
      setOrganizations(orgs)

      const selected = orgs.find((item) => item.id === organizationIdRef.current) ?? orgs[0] ?? null
      const selectedId = selected?.id ?? ''

      organizationIdRef.current = selectedId
      setOrganizationId(selectedId)

      if (selected) {
        const requestId = ++membershipRequestRef.current
        const members = await apiRequest<Membership[]>(`/organizations/${selected.id}/members`)
        if (isStale()) return

        if (requestId === membershipRequestRef.current) {
          const membership = members.find((item) => item.user_id === currentUser.id)
          setRole(membership?.role ?? null)
        }
      } else {
        membershipRequestRef.current += 1
        setRole(null)
      }
    } catch (error) {
      if (isStale()) return

      if (error instanceof ApiError && error.status === 401) {
        membershipRequestRef.current += 1
        organizationIdRef.current = ''
        setUser(null)
        setOrganizations([])
        setOrganizationId('')
        setRole(null)
      } else {
        throw error
      }
    } finally {
      if (!isStale()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve()
      .then(() => refresh())
      .catch(() => {})
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      await apiRequest<User>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      organizationIdRef.current = ''
      await refresh()
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' })
    } finally {
      // Invalidate any refresh still in flight so it cannot restore the signed-out session.
      refreshRequestRef.current += 1
      membershipRequestRef.current += 1
      organizationIdRef.current = ''
      setUser(null)
      setOrganizations([])
      setOrganizationId('')
      setRole(null)
      setLoading(false)
    }
  }, [])

  const selectOrganization = useCallback(
    (id: string) => {
      organizationIdRef.current = id
      setOrganizationId(id)
      setRole(null)

      const currentUser = user
      const requestId = ++membershipRequestRef.current

      if (!currentUser || !id) return

      void apiRequest<Membership[]>(`/organizations/${id}/members`)
        .then((members) => {
          if (requestId !== membershipRequestRef.current) return
          const membership = members.find((item) => item.user_id === currentUser.id)
          setRole(membership?.role ?? null)
        })
        .catch(() => {
          if (requestId === membershipRequestRef.current) setRole(null)
        })
    },
    [user],
  )

  const createOrganization = useCallback(
    async (name: string) => {
      const organization = await apiRequest<Organization>('/organizations', {
        method: 'POST',
        body: { name },
      })

      organizationIdRef.current = organization.id
      await refresh()
      return organization
    },
    [refresh],
  )

  const organization = organizations.find((item) => item.id === organizationId) ?? null

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      organizations,
      organization,
      role,
      loading,
      refresh,
      login,
      logout,
      selectOrganization,
      createOrganization,
    }),
    [
      user,
      organizations,
      organization,
      role,
      loading,
      refresh,
      login,
      logout,
      selectOrganization,
      createOrganization,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
