import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { useAuth } from '../lib/use-auth'

type ServiceStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance'
type Service = {
  id: string
  organization_id: string
  name: string
  description: string | null
  status: ServiceStatus
  created_at: string
  updated_at: string
}

const statuses: ServiceStatus[] = [
  'operational',
  'degraded',
  'partial_outage',
  'major_outage',
  'maintenance',
]

const statusLabels: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  maintenance: 'Maintenance',
}

const statusStyles: Record<ServiceStatus, string> = {
  operational: 'bg-emerald-100 text-emerald-800',
  degraded: 'bg-amber-100 text-amber-800',
  partial_outage: 'bg-orange-100 text-orange-800',
  major_outage: 'bg-red-100 text-red-800',
  maintenance: 'bg-blue-100 text-blue-800',
}

function ServicesPage() {
  const { organization, role } = useAuth()
  const canManage = role === 'admin' || role === 'responder'
  const [services, setServices] = useState<Service[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadServices = useCallback(async () => {
    if (!organization) return
    try {
      const result = await apiRequest<Service[]>(`/organizations/${organization.id}/services`)
      setServices(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load services.')
    } finally {
      setLoading(false)
    }
  }, [organization])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadServices()
  }, [loadServices])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!organization || !name.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const created = await apiRequest<Service>(`/organizations/${organization.id}/services`, {
        method: 'POST',
        body: { name: name.trim(), description: description.trim() || null },
      })
      setServices((current) => [created, ...current])
      setName('')
      setDescription('')
      setSuccess('Service created successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create service.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(service: Service, status: ServiceStatus) {
    if (!organization || !canManage || service.status === status) return
    setError('')
    setSuccess('')
    try {
      const updated = await apiRequest<Service>(
        `/organizations/${organization.id}/services/${service.id}`,
        { method: 'PATCH', body: { status } },
      )
      setServices((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(`${service.name} status updated.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update service.')
    }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Services</h2>
        <p className="mt-2 text-sm text-slate-600">
          Monitor the health and operational status of your organization services.
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
          <h3 className="text-base font-semibold text-slate-900">Add a service</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Service name
              <input
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Public API"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Description
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <button
            disabled={saving || !name.trim()}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Creatingâ€¦' : 'Create service'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Organization services</h3>
          <button
            onClick={() => void loadServices()}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p role="status" className="p-6 text-sm text-slate-500">
            Loading servicesâ€¦
          </p>
        ) : services.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No services yet. Create your first service to start monitoring it.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {services.map((service) => (
              <article
                key={service.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900">{service.name}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {service.description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[service.status]}`}
                  >
                    {statusLabels[service.status]}
                  </span>
                  {canManage && (
                    <label className="sr-only" htmlFor={`service-status-${service.id}`}>
                      Update {service.name} status
                    </label>
                  )}
                  {canManage && (
                    <select
                      id={`service-status-${service.id}`}
                      value={service.status}
                      onChange={(event) =>
                        void handleStatusChange(service, event.target.value as ServiceStatus)
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
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

export default ServicesPage
