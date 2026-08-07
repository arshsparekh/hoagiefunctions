import { describe, it, expect } from 'vitest'
import { formatEventDateTime, eventBucket, timeUntil } from './datetime'

// Build ISO strings from LOCAL components so rendering back to local is TZ-stable.
const localISO = (y: number, mo: number, d: number, h: number, mi = 0) =>
  new Date(y, mo, d, h, mi).toISOString()

describe('formatEventDateTime', () => {
  it('formats a same-day evening range', () => {
    const p = formatEventDateTime(localISO(2026, 7, 6, 21, 0), localISO(2026, 7, 6, 23, 0))
    expect(p.crossesMidnight).toBe(false)
    expect(p.timeLabel).toBe('9:00 PM – 11:00 PM')
    expect(p.dateLabel).toContain('Aug 6')
  })

  it('marks a range that crosses midnight and tags the next weekday', () => {
    const p = formatEventDateTime(localISO(2026, 7, 6, 22, 0), localISO(2026, 7, 7, 1, 0))
    expect(p.crossesMidnight).toBe(true)
    expect(p.timeLabel).toMatch(/10:00 PM – \w{3} 1:00 AM/)
  })

  it('renders midnight and noon as 12', () => {
    const p = formatEventDateTime(localISO(2026, 7, 6, 0, 0), localISO(2026, 7, 6, 12, 30))
    expect(p.timeLabel).toBe('12:00 AM – 12:30 PM')
  })
})

describe('timeUntil', () => {
  const now = new Date(2026, 7, 5, 12, 0) // Aug 5 2026, noon
  const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo, d, h, mi).toISOString()

  it('reports ended, happening now, and upcoming states', () => {
    expect(timeUntil(at(2026, 7, 4, 20), at(2026, 7, 4, 22), now)).toBe('Ended')
    expect(timeUntil(at(2026, 7, 5, 11), at(2026, 7, 5, 14), now)).toBe('Happening now')
    expect(timeUntil(at(2026, 7, 5, 17), at(2026, 7, 5, 19), now)).toBe('In 5h')
    expect(timeUntil(at(2026, 7, 6, 20), at(2026, 7, 6, 22), now)).toBe('Tomorrow')
    expect(timeUntil(at(2026, 7, 8, 20), at(2026, 7, 8, 22), now)).toBe('In 3 days')
  })
})

describe('eventBucket', () => {
  const now = new Date(2026, 7, 5, 12, 0)
  it('buckets today, this week, and later', () => {
    expect(eventBucket(localISO(2026, 7, 5, 20, 0), now)).toBe('today')
    expect(eventBucket(localISO(2026, 7, 8, 20, 0), now)).toBe('week')
    expect(eventBucket(localISO(2026, 7, 20, 20, 0), now)).toBe('upcoming')
  })
})
