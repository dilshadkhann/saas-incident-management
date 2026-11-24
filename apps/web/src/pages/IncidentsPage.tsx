import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { useAuth } from '../lib/use-auth'

type Severity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4'
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'
type Service = { id: string; name: string; status: string }
type Member = { user_id: string; name: string; email: string; role: string }
type Incident = {
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

const severities: Severity[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4']
const lifecycle: IncidentStatus[] = ['investigating', 'identified', 'monitoring', 'resolved']

const severityStyles: Record<Severity, string> = {
  SEV1: 'bg-red-100 text-red-800',
  SEV2: 'bg-orange-100 text-orange-800',
  SEV3: 'bg-amber-100 text-amber-800',
  SEV4: 'bg-slate-100 text-slate-700',
}

function IncidentsPage() {
  const { organization, role } = useAuth()
  const canManage = role === 'admin' || role === 'responder'
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('SEV3')
  const [assigneeId, setAssigneeId] = useState('')

  const loadData = useCallback(async () => {
    if (!organization) return
    try {
      const query = new URLSearchParams()
      if (filterStatus) query.set('status', filterStatus)
      if (filterSeverity) query.set('severity', filterSeverity)
      const suffix = query.toString() ? `?${query.toString()}` : ''
      const [incidentRows, serviceRows, memberRows] = await Promise.all([
        apiRequest<Incident[]>(`/organizations/${organization.id}/incidents${suffix}`),
        apiRequest<Service[]>(`/organizations/${organization.id}/services`),
        apiRequest<Member[]>(`/organizations/${organization.id}/members`),
      ])
      setIncidents(incidentRows)
      setServices(serviceRows)
      setMembers(memberRows)
      setServiceId((current) => current || serviceRows[0]?.id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load incidents.')
    } finally {
      setLoading(false)
    }
  }, [organization, filterStatus, filterSeverity])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!organization || !serviceId || !title.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const created = await apiRequest<Incident>(`/organizations/${organization.id}/incidents`, {
        method: 'POST',
        body: {
          service_id: serviceId,
          title: title.trim(),
          description: description.trim() || null,
          severity,
          assignee_id: assigneeId || null,
        },
      })
      setIncidents((current) => [created, ...current])
      setTitle('')
      setDescription('')
      setAssigneeId('')
      setSuccess('Incident created successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create incident.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(incident: Incident, status: IncidentStatus) {
    if (!organization || !canManage || incident.status === status) return
    setError('')
    setSuccess('')
    try {
      const updated = await apiRequest<Incident>(
        `/organizations/${organization.id}/incidents/${incident.id}`,
        { method: 'PATCH', body: { status } },
      )
      setIncidents((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(`Incident "${incident.title}" updated.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update incident.')
    }
  }

  const serviceName = (id: string) =>
    services.find((service) => service.id === id)?.name ?? 'Unknown service'
  const assigneeName = (id: string | null) =>
    members.find((member) => member.user_id === id)?.name ?? 'Unassigned'

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Incidents</h2>
        <p className="mt-2 text-sm text-slate-600">
          Monitor, investigate, and manage incidents across your organization.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      {canManage && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h3 className="font-semibold text-slate-900">Create an incident</h3>
          {services.length === 0 ? (
            <p className="mt-3 text-sm text-amber-700">
              Create a service before opening an incident.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Service
                  <select
                    required
                    value={serviceId}
                    onChange={(event) => setServiceId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Severity
                  <select
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value as Severity)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {severities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Incident title
                  <input
                    required
                    maxLength={200}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Briefly describe the incident"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Description
                  <textarea
                    maxLength={10000}
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Impact, symptoms, and investigation notes"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Assignee
                  <select
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                disabled={saving || !serviceId || !title.trim()}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Creatingâ€¦' : 'Create incident'}
              </button>
            </>
          )}
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-slate-900">Incident activity</h3>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="incident-status-filter">
              Filter by status
            </label>
            <select
              id="incident-status-filter"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {lifecycle.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="incident-severity-filter">
              Filter by severity
            </label>
            <select
              id="incident-severity-filter"
              value={filterSeverity}
              onChange={(event) => setFilterSeverity(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All severities</option>
              {severities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              onClick={() => void loadData()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p role="status" className="p-6 text-sm text-slate-500">
            Loading incidentsâ€¦
          </p>
        ) : incidents.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No incidents match the current filters.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {incidents.map((incident) => (
              <article key={incident.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900">{incident.title}</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {serviceName(incident.service_id)} Â· Assigned to{' '}
                      {assigneeName(incident.assignee_id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[incident.severity]}`}
                    >
                      {incident.severity}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                      {incident.status}
                    </span>
                  </div>
                </div>
                {incident.description && (
                  <p className="whitespace-pre-wrap text-sm text-slate-600">
                    {incident.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    Detected {new Date(incident.detected_at).toLocaleString()}
                  </p>
                  {canManage && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Update status
                      <select
                        aria-label={`Update status for ${incident.title}`}
                        value={incident.status}
                        onChange={(event) =>
                          void handleStatusChange(incident, event.target.value as IncidentStatus)
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        {lifecycle.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default IncidentsPage
