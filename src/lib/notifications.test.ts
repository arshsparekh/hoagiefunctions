import { describe, it, expect } from 'vitest'
import { relativeTime, notificationHref, notificationAccent } from './notifications'
import type { AppNotification } from './notifications'

const n = (over: Partial<AppNotification> = {}): AppNotification => ({
  id: 'n1',
  userId: 'u1',
  kind: 'applicationApproved',
  title: '',
  body: '',
  ts: 0,
  read: false,
  ...over,
})

describe('relativeTime', () => {
  const now = Date.parse('2026-08-05T12:00:00Z')
  it('buckets minutes, hours, and days', () => {
    expect(relativeTime(now - 30_000, now)).toBe('just now')
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5m')
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3h')
    expect(relativeTime(now - 2 * 86_400_000, now)).toBe('2d')
  })
  it('falls back to a date past a week', () => {
    expect(relativeTime(now - 30 * 86_400_000, now)).toMatch(/[A-Z][a-z]{2} \d+/)
  })
})

describe('notificationHref', () => {
  it('prefers the event, then the club, then null', () => {
    expect(notificationHref(n({ eventId: 'e1', clubId: 'c1' }))).toBe('/event/e1')
    expect(notificationHref(n({ clubId: 'c1' }))).toBe('/club/c1')
    expect(notificationHref(n())).toBeNull()
  })
})

describe('notificationAccent', () => {
  it('maps kinds to accents', () => {
    expect(notificationAccent('membershipApproved')).toBe('success')
    expect(notificationAccent('newEventFromFollowed')).toBe('pink')
    expect(notificationAccent('joinedWaitlist')).toBe('muted')
  })
})
