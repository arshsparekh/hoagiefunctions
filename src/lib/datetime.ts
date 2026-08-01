// Date/time formatting for events. All events store ISO strings; we render them
// in the viewer's local timezone.

function fmtTime(d: Date): string {
  let h = d.getHours()
  const m = d.getMinutes()
  const ap = h < 12 ? 'AM' : 'PM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export interface EventTimeParts {
  /** e.g. "Thu, Jul 31" */
  dateLabel: string
  /** e.g. "9:00 PM – 11:59 PM", or "10:00 PM – Sat 1:00 AM" across midnight */
  timeLabel: string
  crossesMidnight: boolean
}

/** Format an event's start/end into a friendly date + time range. */
export function formatEventDateTime(startISO: string, endISO: string): EventTimeParts {
  const s = new Date(startISO)
  const e = new Date(endISO)
  const crossesMidnight = !sameCalendarDay(s, e)

  const dateLabel = s.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const startT = fmtTime(s)
  const endT = fmtTime(e)
  const timeLabel = crossesMidnight
    ? `${startT} – ${e.toLocaleDateString('en-US', { weekday: 'short' })} ${endT}`
    : `${startT} – ${endT}`

  return { dateLabel, timeLabel, crossesMidnight }
}

export type EventBucket = 'today' | 'week' | 'upcoming'

/** Which feed section an event belongs to, by its start date relative to `now`. */
export function eventBucket(startISO: string, now: Date = new Date()): EventBucket {
  const start = new Date(startISO)
  const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diffDays = Math.round((startMid - todayMid) / 86_400_000)

  if (diffDays <= 0) return 'today' // today or already underway
  if (diffDays <= 6) return 'week'
  return 'upcoming'
}
