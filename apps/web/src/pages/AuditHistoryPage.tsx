import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { useAuth } from '../lib/use-auth'

type AuditLog = {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

type AuditLogPageData = {
  items: AuditLog[]
  total: number
  limit: number
  offset: number
}

const PAGE_SIZE = 20

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function AuditHistoryPage() {
  const { organization } = useAuth()
  const [data, setData] = useState<AuditLogPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionInput, setActionInput] = useState('')
  const [entityInput, setEntityInput] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [offset, setOffset] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!organization?.id) return

    let active = true

    async function loadAuditLogs() {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })

      if (action) params.set('action', action)
      if (entityType) params.set('entity_type', entityType)

      try {
        const result = await apiRequest<AuditLogPageData>(
          `/organizations/${organization?.id}/audit-logs?${params.toString()}`,
        )
        if (active) setData(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load audit history.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadAuditLogs()

    return () => {
      active = false
    }
  }, [organization?.id, action, entityType, offset, refreshKey])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOffset(0)
    setAction(actionInput.trim())
    setEntityType(entityInput.trim())
  }

  const total = data?.total ?? 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (!organization) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Audit History</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select an organization to view its audit history.
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit History</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review recorded activity across your organization.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="min-w-48 flex-1 text-sm font-medium text-slate-700">
          Action
          <input
            value={actionInput}
            onChange={(event) => setActionInput(event.target.value)}
            placeholder="e.g. incident.created"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="min-w-40 flex-1 text-sm font-medium text-slate-700">
          Entity type
          <input
            value={entityInput}
            onChange={(event) => setEntityInput(event.target.value)}
            placeholder="e.g. incident"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => {
            setActionInput('')
            setEntityInput('')
            setAction('')
            setEntityType('')
            setOffset(0)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Activity events</h2>
          <span className="text-sm text-slate-500">
            {total} {total === 1 ? 'event' : 'events'}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500" role="status">
            Loading audit history...
          </div>
        ) : !error && data?.items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-slate-800">No audit events found</p>
            <p className="mt-1 text-sm text-slate-500">
              Activity will appear here as organization events are recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Entity</th>
                  <th className="px-5 py-3 font-semibold">User ID</th>
                  <th className="px-5 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700">
                        {item.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      <div>{item.entity_type ?? '—'}</div>
                      {item.entity_id && (
                        <div
                          className="mt-1 max-w-36 truncate text-xs text-slate-400"
                          title={item.entity_id}
                        >
                          {item.entity_id}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.user_id ? (
                        <span className="block max-w-32 truncate" title={item.user_id}>
                          {item.user_id}
                        </span>
                      ) : (
                        'System'
                      )}
                    </td>
                    <td className="max-w-xs px-5 py-4">
                      {item.details && Object.keys(item.details).length > 0 ? (
                        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                          {JSON.stringify(item.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            {total === 0
              ? 'No results'
              : `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || offset === 0}
              onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={loading || offset + PAGE_SIZE >= total}
              onClick={() => setOffset((value) => value + PAGE_SIZE)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuditHistoryPage
