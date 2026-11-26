import { Link } from 'react-router'
import type { ActivityLine } from '../../lib/dashboard'
import { timeAgo } from '../../lib/time'
import { EmptyState } from '../ui/EmptyState'
import { Panel } from '../ui/Panel'

type ActivityPanelProps = {
  lines: ActivityLine[]
  auditPath: string
}

export function ActivityPanel({ lines, auditPath }: ActivityPanelProps) {
  return (
    <Panel title="Recent activity">
      {lines.length === 0 ? (
        <EmptyState title="No activity yet">
          Changes to incidents, services and your team will be recorded here.
        </EmptyState>
      ) : (
        <>
          <ol>
            {lines.map((line) => (
              <li key={line.id} className="border-b border-slate-200 px-5 py-3.5 last:border-b-0">
                <p className="text-sm leading-snug text-slate-800">
                  <span className="font-semibold text-slate-900">{line.actor}</span> {line.text}
                </p>
                <time
                  dateTime={line.createdAt}
                  title={new Date(line.createdAt).toLocaleString()}
                  className="mt-1 block text-xs text-slate-500"
                >
                  {timeAgo(line.createdAt)}
                </time>
              </li>
            ))}
          </ol>
          <footer className="border-t border-slate-200 px-5 py-3">
            <Link
              to={auditPath}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Open audit history
            </Link>
          </footer>
        </>
      )}
    </Panel>
  )
}
