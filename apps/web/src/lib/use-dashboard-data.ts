import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from './api-client'
import {
  ACTIVE_INCIDENT_STATUSES,
  type AuditLog,
  type Incident,
  type Member,
  type Service,
} from './domain'

/** The incident list endpoint returns at most this many rows per request. */
export const INCIDENT_PAGE_LIMIT = 100
const ACTIVITY_LIMIT = 8
const RECENTLY_RESOLVED_LIMIT = 20

type AuditLogPage = { items: AuditLog[] }

export type DashboardData = {
  services: Service[]
  activeIncidents: Incident[]
  /** Recently resolved incidents. Used only so activity can name incidents that are no longer active. */
  resolvedIncidents: Incident[]
  members: Member[]
  activity: AuditLog[]
  /** True when any active-status list hit the API page limit, so counts may be a lower bound. */
  incidentsTruncated: boolean
}

type Result = { key: string; error: string } | { key: string; data: DashboardData }

export type DashboardState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; data: DashboardData }

export function useDashboardData(organizationId: string | undefined) {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  // Identifies one load. A result only counts if it belongs to the current key, so switching
  // organization or retrying shows the loading state again without resetting state in an effect.
  const requestKey = `${organizationId ?? ''}:${reloadCount}`

  useEffect(() => {
    if (!organizationId) return

    let cancelled = false
    const base = `/organizations/${organizationId}`

    async function load() {
      try {
        const [services, members, activity, resolvedIncidents, ...activeLists] = await Promise.all([
          apiRequest<Service[]>(`${base}/services`),
          apiRequest<Member[]>(`${base}/members`),
          apiRequest<AuditLogPage>(`${base}/audit-logs?limit=${ACTIVITY_LIMIT}`),
          apiRequest<Incident[]>(
            `${base}/incidents?status=resolved&limit=${RECENTLY_RESOLVED_LIMIT}`,
          ),
          ...ACTIVE_INCIDENT_STATUSES.map((status) =>
            apiRequest<Incident[]>(
              `${base}/incidents?status=${status}&limit=${INCIDENT_PAGE_LIMIT}`,
            ),
          ),
        ])

        if (cancelled) return

        setResult({
          key: requestKey,
          data: {
            services,
            members,
            activity: activity.items,
            resolvedIncidents,
            activeIncidents: activeLists.flat(),
            incidentsTruncated: activeLists.some((list) => list.length >= INCIDENT_PAGE_LIMIT),
          },
        })
      } catch (error) {
        if (cancelled) return
        setResult({
          key: requestKey,
          error: error instanceof Error ? error.message : 'Something went wrong.',
        })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [organizationId, requestKey])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  const state: DashboardState =
    result === null || result.key !== requestKey
      ? { phase: 'loading' }
      : 'error' in result
        ? { phase: 'error', message: result.error }
        : { phase: 'ready', data: result.data }

  return { state, reload }
}
