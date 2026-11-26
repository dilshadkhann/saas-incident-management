import { useState } from 'react'
import { Link } from 'react-router'
import { pluralize } from '../../lib/dashboard'
import {
  compareIncidentsByUrgency,
  type Incident,
  type Member,
  type Service,
} from '../../lib/domain'
import { timeAgo } from '../../lib/time'
import { EmptyState } from '../ui/EmptyState'
import { IncidentProgress } from '../ui/IncidentProgress'
import { Panel } from '../ui/Panel'
import { SeverityMark } from '../ui/SeverityMark'

const MAX_ROWS = 8

type ActiveIncidentsPanelProps = {
  incidents: Incident[]
  services: Service[]
  members: Member[]
  currentUserId: string | undefined
  incidentsPath: string
  /** The real total may be higher than the number of incidents loaded. */
  truncated: boolean
}

type Filter = 'all' | 'mine'

export function ActiveIncidentsPanel({
  incidents,
  services,
  members,
  currentUserId,
  incidentsPath,
  truncated,
}: ActiveIncidentsPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const mine = incidents.filter((incident) => incident.assignee_id === currentUserId)
  const visible = [...(filter === 'mine' ? mine : incidents)].sort(compareIncidentsByUrgency)
  const rows = visible.slice(0, MAX_ROWS)

  const serviceName = (id: string) =>
    services.find((service) => service.id === id)?.name ?? 'Unknown service'
  const assigneeName = (id: string | null) =>
    id ? (members.find((member) => member.user_id === id)?.name ?? 'Former member') : 'Unassigned'

  const filterButton = (value: Filter, label: string) => (
    <button
      type="button"
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
      className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
        filter === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  )

  const remaining = visible.length - rows.length

  return (
    <Panel
      title="Active incidents"
      action={
        <div className="flex gap-1" role="group" aria-label="Filter active incidents">
          {filterButton('all', `All (${incidents.length}${truncated ? '+' : ''})`)}
          {filterButton('mine', `Assigned to me (${mine.length})`)}
        </div>
      }
    >
      {rows.length === 0 ? (
        filter === 'mine' ? (
          <EmptyState title="Nothing is assigned to you">
            Incidents assigned to you will show up here while they are active.
          </EmptyState>
        ) : (
          <EmptyState title="No active incidents">
            Incidents show up here from the moment they are reported until they are resolved.
          </EmptyState>
        )
      ) : (
        <>
          <ul>
            {rows.map((incident) => (
              <li
                key={incident.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-slate-200 px-5 py-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <SeverityMark severity={incident.severity} />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 sm:truncate">{incident.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-slate-600">
                    <span>{serviceName(incident.service_id)}</span>
                    <span>Detected {timeAgo(incident.detected_at)}</span>
                    <span>{assigneeName(incident.assignee_id)}</span>
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <IncidentProgress status={incident.status} />
                </div>
              </li>
            ))}
          </ul>
          <footer className="border-t border-slate-200 px-5 py-3">
            <Link
              to={incidentsPath}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {remaining > 0
                ? `View ${pluralize(remaining, 'more incident')} in Incidents`
                : 'Open Incidents'}
            </Link>
          </footer>
        </>
      )}
    </Panel>
  )
}
