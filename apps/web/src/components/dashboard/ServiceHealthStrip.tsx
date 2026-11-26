import { Link } from 'react-router'
import {
  compareServicesByHealth,
  serviceStatusMeta,
  type Incident,
  type Service,
} from '../../lib/domain'
import { pluralize } from '../../lib/dashboard'

const MAX_TILES = 12

type ServiceHealthStripProps = {
  services: Service[]
  activeIncidents: Incident[]
  servicesPath: string
}

/**
 * One tile per service with a status bar on top, worst first, so whatever is broken is the first
 * thing seen. The bars fill in once on load.
 */
export function ServiceHealthStrip({
  services,
  activeIncidents,
  servicesPath,
}: ServiceHealthStripProps) {
  const sorted = [...services].sort(compareServicesByHealth)
  const shown = sorted.slice(0, MAX_TILES)
  const hidden = sorted.length - shown.length

  const incidentCount = (serviceId: string) =>
    activeIncidents.filter((incident) => incident.service_id === serviceId).length

  return (
    <section aria-labelledby="service-health-heading">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="service-health-heading" className="text-base font-semibold text-slate-900">
          Service health
        </h2>
        <Link
          to={servicesPath}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          {hidden > 0 ? `View all ${services.length} services` : 'Manage services'}
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {shown.map((service, index) => {
          const meta = serviceStatusMeta[service.status]
          const incidents = incidentCount(service.id)

          return (
            <li key={service.id}>
              <Link
                to={servicesPath}
                className="group block rounded-sm pb-1"
                aria-label={`${service.name}: ${meta.label}${incidents > 0 ? `, ${pluralize(incidents, 'active incident')}` : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`strip-fill block h-2 rounded-[2px] ${meta.bar}`}
                  style={{ animationDelay: `${index * 35}ms` }}
                />
                <span className="mt-2 block truncate text-sm font-semibold text-slate-900 group-hover:underline">
                  {service.name}
                </span>
                <span className="block text-xs text-slate-600">{meta.label}</span>
                {incidents > 0 ? (
                  <span className="block text-xs font-medium text-slate-800">
                    {pluralize(incidents, 'active incident')}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
