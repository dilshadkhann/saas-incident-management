const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Short relative time such as "just now", "12 min ago", "3 h ago", "5 d ago".
 * Falls back to a calendar date after 30 days. `now` is injectable so it can be tested.
 */
export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const then = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000)

  if (Number.isNaN(seconds)) return ''
  // Small clock differences between server and browser can make a fresh event look like the future.
  if (seconds < 45) return 'just now'
  if (seconds < HOUR) return `${Math.max(1, Math.round(seconds / MINUTE))} min ago`
  if (seconds < DAY) return `${Math.round(seconds / HOUR)} h ago`
  if (seconds < 30 * DAY) return `${Math.round(seconds / DAY)} d ago`

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(then)
}
