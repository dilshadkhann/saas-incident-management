import {
  incidentStatusLabel,
  serviceStatusMeta,
  severityRank,
  type AuditLog,
  type Incident,
  type IncidentStatus,
  type Member,
  type Service,
  type ServiceStatus,
  type Severity,
} from './domain'

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export type HealthSummary = {
  /** The one-line statement the dashboard opens with. */
  headline: string
  /** A short supporting sentence, or an empty string when there is nothing to add. */
  detail: string
  /** True when nothing needs anyone's attention. */
  allClear: boolean
  activeCount: number
  highestSeverity: Severity | null
}

type SummaryInput = {
  services: Service[]
  activeIncidents: Incident[]
  /** True when the incident list hit the API's page limit, so the real total may be higher. */
  incidentsTruncated: boolean
}

function countByStatus(services: Service[]): Partial<Record<ServiceStatus, number>> {
  const counts: Partial<Record<ServiceStatus, number>> = {}
  for (const service of services) counts[service.status] = (counts[service.status] ?? 0) + 1
  return counts
}

function attentionPhrase(status: ServiceStatus): string {
  return status === 'maintenance'
    ? 'under maintenance'
    : serviceStatusMeta[status].label.toLowerCase()
}

/** Describes which services are not operational, worst first, e.g. "1 major outage, 2 degraded". */
function describeAttention(services: Service[]): string {
  const counts = countByStatus(services)
  const order: ServiceStatus[] = ['major_outage', 'partial_outage', 'degraded', 'maintenance']
  return order
    .filter((status) => (counts[status] ?? 0) > 0)
    .map((status) => `${counts[status]} ${attentionPhrase(status)}`)
    .join(', ')
}

export function summarizeHealth({
  services,
  activeIncidents,
  incidentsTruncated,
}: SummaryInput): HealthSummary {
  const activeCount = activeIncidents.length
  const notOperational = services.filter((service) => service.status !== 'operational')
  const highestSeverity =
    activeIncidents.reduce<Severity | null>((worst, incident) => {
      if (worst === null) return incident.severity
      return severityRank[incident.severity] < severityRank[worst] ? incident.severity : worst
    }, null) ?? null

  if (services.length === 0 && activeCount === 0) {
    return {
      headline: 'Nothing to monitor yet',
      detail: 'Add a service to start tracking its health and reporting incidents.',
      allClear: false,
      activeCount,
      highestSeverity,
    }
  }

  if (activeCount > 0) {
    const total = incidentsTruncated ? `${activeCount}+` : String(activeCount)
    const noun = activeCount === 1 && !incidentsTruncated ? 'incident' : 'incidents'
    const parts = [`Most severe is ${highestSeverity}.`]
    if (notOperational.length > 0) parts.push(`${describeAttention(services)}.`)
    return {
      headline: `${total} ${noun} active`,
      detail: capitalizeFirst(parts.join(' ')),
      allClear: false,
      activeCount,
      highestSeverity,
    }
  }

  if (notOperational.length > 0) {
    return {
      headline: 'No active incidents',
      detail: `${capitalizeFirst(describeAttention(services))}.`,
      allClear: false,
      activeCount,
      highestSeverity,
    }
  }

  return {
    headline: 'All systems operational',
    detail:
      services.length === 1
        ? 'No active incidents. 1 service is reporting normally.'
        : `No active incidents. All ${services.length} services are reporting normally.`,
    allClear: true,
    activeCount,
    highestSeverity,
  }
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export type ActivityContext = {
  members: Member[]
  /** Any incidents the dashboard knows about, so activity can name them. */
  incidents: Incident[]
  services: Service[]
}

export type ActivityLine = {
  id: string
  actor: string
  /** What happened, written to follow the actor's name, e.g. `moved “API latency” to Identified`. */
  text: string
  createdAt: string
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function labelForIncidentStatus(value: string): string {
  return incidentStatusLabel[value as IncidentStatus] ?? value
}

/** Turns a raw audit log row into a sentence a person would write. */
export function describeActivity(log: AuditLog, context: ActivityContext): ActivityLine {
  const actor = context.members.find((member) => member.user_id === log.user_id)?.name ?? 'Someone'
  const details = log.details ?? {}
  const updated = (details.updated ?? {}) as Record<string, unknown>

  const incident = context.incidents.find((item) => item.id === log.entity_id)
  const incidentName = incident
    ? `“${incident.title}”`
    : asString(details.title)
      ? `“${asString(details.title)}”`
      : 'an incident'
  const service = context.services.find((item) => item.id === log.entity_id)
  const serviceName = asString(details.name)
    ? `“${asString(details.name)}”`
    : service
      ? `“${service.name}”`
      : 'a service'

  let text: string

  switch (log.action) {
    case 'incident.created': {
      const severity = asString(details.severity)
      text = `reported ${severity ? `${severity} ` : ''}incident ${incidentName}`
      break
    }
    case 'incident.updated': {
      const status = asString(updated.status)
      const severity = asString(updated.severity)
      if (status) text = `moved ${incidentName} to ${labelForIncidentStatus(status)}`
      else if (severity) text = `changed ${incidentName} to ${severity}`
      else if ('assignee_id' in updated) text = `changed the assignee on ${incidentName}`
      else text = `updated ${incidentName}`
      break
    }
    case 'service.created':
      text = `added service ${serviceName}`
      break
    case 'service.updated': {
      const status = asString(updated.status)
      const label = status ? serviceStatusMeta[status as ServiceStatus]?.label : undefined
      text = label
        ? `set ${serviceName} to ${label.toLowerCase()}`
        : `updated service ${serviceName}`
      break
    }
    case 'organization.created':
      text = 'created the organization'
      break
    case 'organization.updated':
      text = 'renamed the organization'
      break
    case 'invitation.created':
      text = `invited ${asString(details.email) ?? 'someone'} as ${asString(details.role) ?? 'a member'}`
      break
    case 'invitation.accepted':
      text = 'accepted an invitation'
      break
    case 'membership.role_updated':
      text = `changed ${asString(details.target_email) ?? 'a member'}’s role to ${asString(details.new_role) ?? 'a new role'}`
      break
    case 'membership.removed':
      text = `removed ${asString(details.target_email) ?? 'a member'} from the organization`
      break
    default:
      text = log.action.replace(/[._]/g, ' ')
  }

  return { id: log.id, actor, text, createdAt: log.created_at }
}
