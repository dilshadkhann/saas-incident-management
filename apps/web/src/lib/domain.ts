// Shared vocabulary for services, incidents and activity. The backend owns these values
// (see apps/api/app/schemas), so keep this file in step with it.

export type ServiceStatus =
  'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance'

export type Severity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4'
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'

export type Service = {
  id: string
  organization_id: string
  name: string
  description: string | null
  status: ServiceStatus
  created_at: string
  updated_at: string
}

export type Incident = {
  id: string
  organization_id: string
  service_id: string
  assignee_id: string | null
  title: string
  description: string | null
  severity: Severity
  status: IncidentStatus
  detected_at: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type Member = {
  user_id: string
  name: string
  email: string
  role: 'admin' | 'responder' | 'viewer'
}

export type AuditLog = {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

/** Statuses an incident can be in while it still needs someone's attention. */
export const ACTIVE_INCIDENT_STATUSES = ['investigating', 'identified', 'monitoring'] as const

/** The lifecycle in order, used to show how far along an incident is. */
export const INCIDENT_LIFECYCLE: IncidentStatus[] = [
  'investigating',
  'identified',
  'monitoring',
  'resolved',
]

export const incidentStatusLabel: Record<IncidentStatus, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
}

type StatusMeta = {
  label: string
  /** Tailwind background class for the status color. */
  bar: string
  /** Lower is worse. Used to list the services that need attention first. */
  rank: number
}

export const serviceStatusMeta: Record<ServiceStatus, StatusMeta> = {
  major_outage: { label: 'Major outage', bar: 'bg-status-major', rank: 0 },
  partial_outage: { label: 'Partial outage', bar: 'bg-status-partial', rank: 1 },
  degraded: { label: 'Degraded', bar: 'bg-status-degraded', rank: 2 },
  maintenance: { label: 'Maintenance', bar: 'bg-status-maintenance', rank: 3 },
  operational: { label: 'Operational', bar: 'bg-status-operational', rank: 4 },
}

export const severityRank: Record<Severity, number> = { SEV1: 0, SEV2: 1, SEV3: 2, SEV4: 3 }

/** Orders incidents most urgent first: severity, then most recently detected. */
export function compareIncidentsByUrgency(a: Incident, b: Incident): number {
  const bySeverity = severityRank[a.severity] - severityRank[b.severity]
  if (bySeverity !== 0) return bySeverity
  return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
}

/** Orders services with the ones needing attention first, then alphabetically. */
export function compareServicesByHealth(a: Service, b: Service): number {
  const byStatus = serviceStatusMeta[a.status].rank - serviceStatusMeta[b.status].rank
  if (byStatus !== 0) return byStatus
  return a.name.localeCompare(b.name)
}
