import type { Severity } from '../../lib/domain'

const styles: Record<Severity, string> = {
  SEV1: 'bg-sev-1 text-white',
  SEV2: 'bg-sev-2 text-white',
  SEV3: 'bg-sev-3 text-slate-900',
  SEV4: 'border border-slate-400 text-slate-700',
}

/** A compact block marking incident severity. The text is always shown, never color alone. */
export function SeverityMark({ severity }: { severity: Severity }) {
  return (
    <span
      className={`type-mark inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-sm px-2 text-sm ${styles[severity]}`}
    >
      {severity}
    </span>
  )
}
