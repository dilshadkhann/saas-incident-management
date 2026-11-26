import { describe, expect, it } from 'vitest'
import { describeActivity, summarizeHealth } from './dashboard'
import {
  compareIncidentsByUrgency,
  compareServicesByHealth,
  type AuditLog,
  type Incident,
  type Member,
  type Service,
} from './domain'
import { timeAgo } from './time'

const NOW = '2026-11-26T10:00:00Z'

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: 'svc-1',
    organization_id: 'org-1',
    name: 'Public API',
    description: null,
    status: 'operational',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'inc-1',
    organization_id: 'org-1',
    service_id: 'svc-1',
    assignee_id: null,
    title: 'API latency spike',
    description: null,
    severity: 'SEV2',
    status: 'investigating',
    detected_at: NOW,
    resolved_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

const members: Member[] = [
  { user_id: 'user-1', name: 'Priya Nair', email: 'priya@example.com', role: 'admin' },
]

function log(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    action: 'incident.created',
    entity_type: 'incident',
    entity_id: 'inc-1',
    details: null,
    created_at: NOW,
    ...overrides,
  }
}

describe('summarizeHealth', () => {
  it('asks for a first service when there is nothing to monitor', () => {
    const summary = summarizeHealth({
      services: [],
      activeIncidents: [],
      incidentsTruncated: false,
    })
    expect(summary.headline).toBe('Nothing to monitor yet')
    expect(summary.allClear).toBe(false)
  })

  it('reports all clear only when every service is operational and nothing is active', () => {
    const summary = summarizeHealth({
      services: [service(), service({ id: 'svc-2', name: 'Database' })],
      activeIncidents: [],
      incidentsTruncated: false,
    })
    expect(summary).toMatchObject({ headline: 'All systems operational', allClear: true })
    expect(summary.detail).toBe('No active incidents. All 2 services are reporting normally.')
  })

  it('is not all clear when a service is degraded, even with no incidents', () => {
    const summary = summarizeHealth({
      services: [service({ status: 'degraded' })],
      activeIncidents: [],
      incidentsTruncated: false,
    })
    expect(summary.headline).toBe('No active incidents')
    expect(summary.detail).toBe('1 degraded.')
    expect(summary.allClear).toBe(false)
  })

  it('words maintenance naturally in the summary', () => {
    const summary = summarizeHealth({
      services: [service({ status: 'maintenance' }), service({ id: 'svc-2', status: 'degraded' })],
      activeIncidents: [],
      incidentsTruncated: false,
    })
    expect(summary.detail).toBe('1 degraded, 1 under maintenance.')
  })

  it('is not all clear when a service is under maintenance', () => {
    const summary = summarizeHealth({
      services: [service({ status: 'maintenance' })],
      activeIncidents: [],
      incidentsTruncated: false,
    })
    expect(summary.allClear).toBe(false)
  })

  it('counts active incidents and names the most severe', () => {
    const summary = summarizeHealth({
      services: [service({ status: 'major_outage' }), service({ id: 'svc-2', status: 'degraded' })],
      activeIncidents: [
        incident({ severity: 'SEV3' }),
        incident({ id: 'inc-2', severity: 'SEV1' }),
        incident({ id: 'inc-3', severity: 'SEV2' }),
      ],
      incidentsTruncated: false,
    })
    expect(summary.headline).toBe('3 incidents active')
    expect(summary.highestSeverity).toBe('SEV1')
    expect(summary.detail).toBe('Most severe is SEV1. 1 major outage, 1 degraded.')
  })

  it('uses the singular for exactly one incident', () => {
    const summary = summarizeHealth({
      services: [service()],
      activeIncidents: [incident()],
      incidentsTruncated: false,
    })
    expect(summary.headline).toBe('1 incident active')
  })

  it('shows a lower bound when the API page limit was reached', () => {
    const summary = summarizeHealth({
      services: [service()],
      activeIncidents: Array.from({ length: 100 }, (_, index) => incident({ id: `inc-${index}` })),
      incidentsTruncated: true,
    })
    expect(summary.headline).toBe('100+ incidents active')
  })
})

describe('describeActivity', () => {
  const context = {
    members,
    services: [service()],
    incidents: [incident({ title: 'API latency spike' })],
  }

  it('names the person who acted, and falls back for unknown users', () => {
    expect(describeActivity(log(), context).actor).toBe('Priya Nair')
    expect(describeActivity(log({ user_id: 'gone' }), context).actor).toBe('Someone')
    expect(describeActivity(log({ user_id: null }), context).actor).toBe('Someone')
  })

  it('describes a new incident with its severity and title', () => {
    const line = describeActivity(log({ details: { severity: 'SEV1' } }), context)
    expect(line.text).toBe('reported SEV1 incident “API latency spike”')
  })

  it('describes a status change using the readable status name', () => {
    const line = describeActivity(
      log({ action: 'incident.updated', details: { updated: { status: 'identified' } } }),
      context,
    )
    expect(line.text).toBe('moved “API latency spike” to Identified')
  })

  it('describes assignee and severity changes', () => {
    const assignee = describeActivity(
      log({ action: 'incident.updated', details: { updated: { assignee_id: 'user-1' } } }),
      context,
    )
    expect(assignee.text).toBe('changed the assignee on “API latency spike”')

    const severity = describeActivity(
      log({ action: 'incident.updated', details: { updated: { severity: 'SEV1' } } }),
      context,
    )
    expect(severity.text).toBe('changed “API latency spike” to SEV1')
  })

  it('does not invent a title when the incident is unknown', () => {
    const line = describeActivity(
      log({
        entity_id: 'unknown',
        action: 'incident.updated',
        details: { updated: { status: 'resolved' } },
      }),
      context,
    )
    expect(line.text).toBe('moved an incident to Resolved')
  })

  it('looks up service names, because service audit entries do not store them on update', () => {
    const line = describeActivity(
      log({
        action: 'service.updated',
        entity_type: 'service',
        entity_id: 'svc-1',
        details: { updated: { status: 'major_outage' } },
      }),
      context,
    )
    expect(line.text).toBe('set “Public API” to major outage')
  })

  it('describes team changes', () => {
    expect(
      describeActivity(
        log({
          action: 'invitation.created',
          details: { email: 'sam@example.com', role: 'responder' },
        }),
        context,
      ).text,
    ).toBe('invited sam@example.com as responder')
    expect(
      describeActivity(
        log({ action: 'membership.removed', details: { target_email: 'sam@example.com' } }),
        context,
      ).text,
    ).toBe('removed sam@example.com from the organization')
  })

  it('falls back to a readable phrase for actions it does not know', () => {
    expect(describeActivity(log({ action: 'billing.plan_changed' }), context).text).toBe(
      'billing plan changed',
    )
  })
})

describe('ordering', () => {
  it('lists the most severe, then the most recent, incidents first', () => {
    const sorted = [
      incident({ id: 'old-sev2', severity: 'SEV2', detected_at: '2026-11-20T00:00:00Z' }),
      incident({ id: 'sev1', severity: 'SEV1', detected_at: '2026-11-01T00:00:00Z' }),
      incident({ id: 'new-sev2', severity: 'SEV2', detected_at: '2026-11-25T00:00:00Z' }),
    ].sort(compareIncidentsByUrgency)
    expect(sorted.map((item) => item.id)).toEqual(['sev1', 'new-sev2', 'old-sev2'])
  })

  it('lists services that need attention first, then alphabetically', () => {
    const sorted = [
      service({ id: 'a', name: 'Zeta', status: 'operational' }),
      service({ id: 'b', name: 'Beta', status: 'operational' }),
      service({ id: 'c', name: 'Mid', status: 'major_outage' }),
      service({ id: 'd', name: 'Low', status: 'degraded' }),
    ].sort(compareServicesByHealth)
    expect(sorted.map((item) => item.name)).toEqual(['Mid', 'Low', 'Beta', 'Zeta'])
  })
})

describe('timeAgo', () => {
  const now = new Date(NOW)
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString()

  it.each([
    [10, 'just now'],
    [-30, 'just now'],
    [90, '2 min ago'],
    [60 * 59, '59 min ago'],
    [60 * 60 * 3, '3 h ago'],
    [60 * 60 * 24 * 5, '5 d ago'],
  ])('formats %i seconds ago as %s', (seconds, expected) => {
    expect(timeAgo(ago(seconds), now)).toBe(expected)
  })

  it('falls back to a calendar date after 30 days', () => {
    expect(timeAgo(ago(60 * 60 * 24 * 45), now)).toMatch(/2026/)
  })

  it('returns an empty string for an invalid date instead of "NaN d ago"', () => {
    expect(timeAgo('not a date', now)).toBe('')
  })
})
