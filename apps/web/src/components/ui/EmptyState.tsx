import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  children: ReactNode
  action?: ReactNode
}

/** Shown when a list has nothing in it yet. Says what the thing is and what to do next. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="px-5 py-10">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-600">{children}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
