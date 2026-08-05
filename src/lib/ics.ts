// Calendar export. Turns an event into an RFC-5545 .ics file the user can add to
// Apple/Google/Outlook calendars, and a Google Calendar "add" URL as a fallback.

export interface IcsEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: string // ISO
  end: string // ISO
  url?: string
}

/** ISO -> iCalendar UTC stamp: 20260806T210000Z */
function icsStamp(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/** Escape per RFC 5545 (backslash, newline, comma, semicolon). */
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** Build the .ics text for a single event. `now` is injectable for tests. */
export function buildIcs(e: IcsEvent, now: string = new Date().toISOString()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//hoagiefunctions//Campus Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@hoagiefunctions`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : '',
    e.description ? `DESCRIPTION:${esc(e.description)}` : '',
    e.url ? `URL:${esc(e.url)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

/** A "safe-ish" file name from a title. */
export function icsFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${slug || 'event'}.ics`
}

/** Trigger a client-side download of the .ics for an event (browser only). */
export function downloadIcs(e: IcsEvent): void {
  const blob = new Blob([buildIcs(e)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = icsFileName(e.title)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
