import { describe, it, expect } from 'vitest'
import { canManageEvent, canSeeEvent, audienceLabel } from './visibility'
import type { CampusEvent, Club, User } from '../data/seed'

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'User One',
  classYear: 2027,
  avatarColor: '#000000',
  clubMemberships: [],
  adminOf: [],
  rsvps: [],
  applications: [],
  ...over,
})

const event = (over: Partial<CampusEvent> = {}): CampusEvent => ({
  id: 'e1',
  title: 'Test',
  description: '',
  hostType: 'club',
  hostId: 'c1',
  hostName: 'Cannon',
  buildingId: 'b1',
  start: '2026-08-06T21:00:00Z',
  end: '2026-08-06T23:00:00Z',
  accessType: 'open',
  tags: [],
  reservationConfirmed: false,
  attendeeIds: [],
  applicants: [],
  ...over,
})

const club = (over: Partial<Club> = {}): Club => ({
  id: 'c1',
  name: 'Cannon',
  kind: 'club',
  colorFill: 'red',
  description: '',
  adminIds: [],
  memberIds: [],
  pendingIds: [],
  ...over,
})

describe('canManageEvent', () => {
  it('lets the individual host manage their own event', () => {
    const e = event({ hostType: 'individual', hostId: 'u1' })
    expect(canManageEvent(e, user({ id: 'u1' }))).toBe(true)
    expect(canManageEvent(e, user({ id: 'u2' }))).toBe(false)
  })

  it('lets a club admin manage the club event, but not a plain member', () => {
    const e = event({ hostType: 'club', hostId: 'c1' })
    expect(canManageEvent(e, user({ adminOf: ['c1'] }))).toBe(true)
    expect(canManageEvent(e, user({ clubMemberships: [{ clubId: 'c1', status: 'member' }] }))).toBe(
      false,
    )
  })
})

describe('canSeeEvent', () => {
  it('shows open (everyone) events to anyone', () => {
    expect(canSeeEvent(event(), user({ id: 'nobody' }))).toBe(true)
  })

  it('restricts invite-only events to invitees (and the host)', () => {
    const e = event({
      hostType: 'individual',
      hostId: 'u9',
      audience: { kind: 'people', userIds: ['u2'] },
    })
    expect(canSeeEvent(e, user({ id: 'u2' }))).toBe(true)
    expect(canSeeEvent(e, user({ id: 'u3' }))).toBe(false)
    expect(canSeeEvent(e, user({ id: 'u9' }))).toBe(true) // host always sees it
  })

  it('restricts club-only events to confirmed members, admins, or badge holders', () => {
    const e = event({ audience: { kind: 'club', clubId: 'c1' } })
    expect(canSeeEvent(e, user({ clubMemberships: [{ clubId: 'c1', status: 'member' }] }))).toBe(
      true,
    )
    expect(canSeeEvent(e, user({ clubMemberships: [{ clubId: 'c1', status: 'pending' }] }))).toBe(
      false,
    )
    expect(canSeeEvent(e, user({ adminOf: ['c1'] }))).toBe(true)
    expect(canSeeEvent(e, user({ eatingClubId: 'c1' }))).toBe(true)
    expect(canSeeEvent(e, user({ id: 'outsider' }))).toBe(false)
  })
})

describe('audienceLabel', () => {
  it('returns null for everyone, and a label otherwise', () => {
    expect(audienceLabel(event(), [club()])).toBeNull()
    expect(audienceLabel(event({ audience: { kind: 'people', userIds: [] } }), [club()])).toBe(
      'Invite only',
    )
    expect(
      audienceLabel(event({ audience: { kind: 'club', clubId: 'c1' } }), [club({ name: 'Cannon' })]),
    ).toBe('Cannon only')
  })
})
