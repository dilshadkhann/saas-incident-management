import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  /** Optional control shown opposite the title, such as a link or filter. */
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, action, children, className = '' }: PanelProps) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 px-5 py-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}
