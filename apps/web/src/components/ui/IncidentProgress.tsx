import { INCIDENT_LIFECYCLE, incidentStatusLabel, type IncidentStatus } from '../../lib/domain'

/** Four ticks showing how far an incident is through its lifecycle, with the stage named. */
export function IncidentProgress({ status }: { status: IncidentStatus }) {
  const reached = INCIDENT_LIFECYCLE.indexOf(status)

  return (
    <div className="flex items-center gap-2" data-status={status}>
      <div className="flex gap-0.5" aria-hidden="true">
        {INCIDENT_LIFECYCLE.map((stage, index) => (
          <span
            key={stage}
            className={`h-1.5 w-3.5 rounded-[1px] ${index <= reached ? 'bg-slate-800' : 'bg-slate-300'}`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-slate-600">{incidentStatusLabel[status]}</span>
    </div>
  )
}
