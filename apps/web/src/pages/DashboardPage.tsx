import { ActiveIncidentsPanel } from '../components/dashboard/ActiveIncidentsPanel'
import { ActivityPanel } from '../components/dashboard/ActivityPanel'
import { ServiceHealthStrip } from '../components/dashboard/ServiceHealthStrip'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel } from '../components/ui/Panel'
import { describeActivity, summarizeHealth } from '../lib/dashboard'
import { useAuth } from '../lib/use-auth'
import { useDashboardData } from '../lib/use-dashboard-data'

function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-6xl space-y-10">
      <span className="sr-only">Loading dashboard…</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-14 w-3/4 max-w-xl rounded bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 rounded bg-slate-200" />
        ))}
      </div>
    </div>
  )
}

function DashboardPage() {
  const { organization, user, role } = useAuth()
  const { state, reload } = useDashboardData(organization?.id)

  const basePath = role === 'admin' ? '/admin' : role === 'responder' ? '/responder' : '/viewer'
  const incidentsPath = `${basePath}/incidents`
  const servicesPath = `${basePath}/services`
  const auditPath = `${basePath}/audit-logs`
  const canReport = role === 'admin' || role === 'responder'

  if (state.phase === 'loading') return <DashboardSkeleton />

  if (state.phase === 'error') {
    return (
      <div className="mx-auto max-w-6xl">
        <Panel title="Dashboard">
          <EmptyState
            title="The dashboard didn’t load"
            action={<Button onClick={reload}>Try again</Button>}
          >
            {state.message} Check your connection and try again.
          </EmptyState>
        </Panel>
      </div>
    )
  }

  const { data } = state
  const summary = summarizeHealth({
    services: data.services,
    activeIncidents: data.activeIncidents,
    incidentsTruncated: data.incidentsTruncated,
  })
  const activityContext = {
    members: data.members,
    services: data.services,
    incidents: [...data.activeIncidents, ...data.resolvedIncidents],
  }
  const activity = data.activity.map((log) => describeActivity(log, activityContext))

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header>
        <p className="text-sm text-slate-600">{organization?.name}</p>
        <h1
          className={`type-display mt-1.5 text-[clamp(2.4rem,6.5vw,4.25rem)] ${
            summary.allClear ? 'text-status-operational' : 'text-slate-900'
          }`}
        >
          {summary.headline}
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-600">
          {summary.detail}
        </p>

        {canReport && data.services.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2.5">
            <ButtonLink to={incidentsPath}>Report an incident</ButtonLink>
            <ButtonLink to={servicesPath} variant="secondary">
              Add a service
            </ButtonLink>
          </div>
        ) : null}
      </header>

      {data.services.length > 0 ? (
        <ServiceHealthStrip
          services={data.services}
          activeIncidents={data.activeIncidents}
          servicesPath={servicesPath}
        />
      ) : (
        <Panel title="Service health">
          <EmptyState
            title="Add your first service"
            action={
              canReport ? <ButtonLink to={servicesPath}>Add a service</ButtonLink> : undefined
            }
          >
            {canReport
              ? 'Services are the things your team keeps running, such as an API or a database. Add one to track its health and report incidents against it.'
              : 'No services have been added yet. An admin or responder can add the first one.'}
          </EmptyState>
        </Panel>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <ActiveIncidentsPanel
          incidents={data.activeIncidents}
          services={data.services}
          members={data.members}
          currentUserId={user?.id}
          incidentsPath={incidentsPath}
          truncated={data.incidentsTruncated}
        />
        <ActivityPanel lines={activity} auditPath={auditPath} />
      </div>
    </div>
  )
}

export default DashboardPage
