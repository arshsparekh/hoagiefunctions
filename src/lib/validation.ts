// Input validation + sanitization for user-authored content (events).
//
// This is a client-only app today, so there is no server to trust the client.
// But treating our own inputs defensively is good hygiene and mirrors exactly the
// checks a real backend (see supabase/schema.sql) would enforce: bound the size
// of every field, normalize whitespace, strip control/zero-width characters, and
// reject nonsensical time ranges. React already escapes rendered strings, so this
// is about data integrity and abuse-resistance, not XSS alone.

export const LIMITS = {
  titleMin: 3,
  titleMax: 80,
  descriptionMax: 1000,
  commentMax: 500,
  locationMax: 80,
  capacityMin: 1,
  capacityMax: 100_000,
  /** An event may not run longer than this (guards typos like AM/PM slips). */
  maxDurationMs: 24 * 60 * 60 * 1000,
  /** How far in the past a start time may be (a small grace window). */
  maxPastMs: 60 * 60 * 1000,
} as const

// Character-level scrubbing without fragile literal control chars in source:
// drop C0/C1 control characters (keeping tab, newline, carriage return) plus the
// zero-width joiners/space and the byte-order mark, which are common paste gremlins.
function isStrippable(codePoint: number): boolean {
  const isTabNlCr = codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d
  const isControl = (codePoint <= 0x1f && !isTabNlCr) || codePoint === 0x7f
  const isZeroWidth =
    codePoint === 0x200b || codePoint === 0x200c || codePoint === 0x200d || codePoint === 0xfeff
  return isControl || isZeroWidth
}

/** Normalize newlines, strip control + zero-width characters, and trim. */
export function sanitizeText(input: string): string {
  let out = ''
  for (const ch of input.replace(/\r\n?/g, '\n')) {
    if (!isStrippable(ch.codePointAt(0) ?? 0)) out += ch
  }
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

/** Like sanitizeText but collapses all runs of whitespace to a single space. */
export function sanitizeSingleLine(input: string): string {
  return sanitizeText(input).replace(/\s+/g, ' ')
}

/** Clamp a number into [min, max]; returns undefined for non-finite input. */
export function clampInt(value: number, min: number, max: number): number | undefined {
  if (!Number.isFinite(value)) return undefined
  return Math.min(max, Math.max(min, Math.round(value)))
}

export interface EventDraft {
  title: string
  description: string
  location: string
  start: string // ISO
  end: string // ISO
  capacity?: number
}

export type FieldErrors = Partial<
  Record<'title' | 'description' | 'location' | 'time' | 'capacity', string>
>

/**
 * Validate a create/edit draft. Returns per-field messages so the form can show
 * them inline. `now` is injectable for tests.
 */
export function validateEventDraft(d: EventDraft, now: number = Date.now()): FieldErrors {
  const errors: FieldErrors = {}

  const title = sanitizeSingleLine(d.title)
  if (title.length < LIMITS.titleMin) errors.title = 'Give your event a title.'
  else if (title.length > LIMITS.titleMax)
    errors.title = `Keep the title under ${LIMITS.titleMax} characters.`

  if (sanitizeText(d.description).length > LIMITS.descriptionMax)
    errors.description = `Descriptions are limited to ${LIMITS.descriptionMax} characters.`

  const location = sanitizeSingleLine(d.location)
  if (location.length === 0) errors.location = 'Pick or add a location.'
  else if (location.length > LIMITS.locationMax) errors.location = 'That location name is too long.'

  const start = Date.parse(d.start)
  const end = Date.parse(d.end)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    errors.time = 'Enter a valid start and end time.'
  } else if (end <= start) {
    errors.time = 'The event has to end after it starts.'
  } else if (end - start > LIMITS.maxDurationMs) {
    errors.time = 'That event runs longer than a day - double-check the times.'
  } else if (start < now - LIMITS.maxPastMs) {
    errors.time = 'That start time is in the past.'
  }

  if (d.capacity !== undefined) {
    if (!Number.isFinite(d.capacity) || d.capacity < LIMITS.capacityMin)
      errors.capacity = 'Capacity must be a positive number.'
    else if (d.capacity > LIMITS.capacityMax)
      errors.capacity = 'That capacity is unrealistically large.'
  }

  return errors
}

export const hasErrors = (e: FieldErrors): boolean => Object.keys(e).length > 0
