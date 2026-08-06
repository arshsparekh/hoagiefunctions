import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './store'
import type { CreateEventInput } from './store'
import type { CampusEvent } from './data/seed'

const s = () => useStore.getState()

// A valid future window (validation rejects past starts / >24h spans).
const futureWindow = (hoursOut = 48) => {
  const start = new Date(Date.now() + hoursOut * 3_600_000)
  const end = new Date(start.getTime() + 2 * 3_600_000)
  return { start: start.toISOString(), end: end.toISOString() }
}

const arshEvent = (over: Partial<CreateEventInput> = {}): CreateEventInput => ({
  title: 'Late Night Study Jam',
  description: 'bring snacks',
  hostType: 'individual',
  hostId: 'u-arsh',
  hostName: 'Arsh Parekh',
  buildingId: 'b-frist',
  accessType: 'open',
  tags: [],
  reservationConfirmed: false,
  ...futureWindow(),
  ...over,
})

beforeEach(() => {
  s().resetDemo() // viewAs === 'me' (u-arsh) after reset
  s().markAllNotificationsRead() // clear seeded notifications for a clean baseline
})

describe('rsvp / cancel', () => {
  it('adds and removes the current user as an attendee', () => {
    const created = s().createEvent(arshEvent())
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const id = created.event.id

    expect(s().rsvp(id).ok).toBe(true)
    expect(s().events.find((e) => e.id === id)!.attendeeIds).toContain('u-arsh')
    expect(s().currentUser().rsvps).toContain(id)

    expect(s().cancelRsvp(id).ok).toBe(true)
    expect(s().events.find((e) => e.id === id)!.attendeeIds).not.toContain('u-arsh')
    expect(s().currentUser().rsvps).not.toContain(id)
  })

  it('refuses to RSVP to a private event you cannot see', () => {
    const created = s().createEvent(
      arshEvent({ audience: { kind: 'people', userIds: ['u-maya'] } }),
    )
    if (!created.ok) throw new Error('setup failed')
    s().setViewAs('newStudent')
    const r = s().rsvp(created.event.id)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/private/i)
  })
})

describe('capacity waitlist + promotion', () => {
  it('waitlists when full and promotes the next person when a seat frees', () => {
    const created = s().createEvent(arshEvent({ capacity: 1 }))
    if (!created.ok) throw new Error('setup failed')
    const id = created.event.id

    // Arsh takes the only seat.
    expect(s().rsvp(id).ok).toBe(true)

    // Guest tries -> waitlisted.
    s().setViewAs('newStudent')
    const guestTry = s().rsvp(id)
    expect(guestTry.ok).toBe(false)
    expect(guestTry.waitlisted).toBe(true)
    expect(s().events.find((e) => e.id === id)!.waitlistIds).toContain('u-guest')

    // Arsh cancels -> guest is promoted and notified.
    s().setViewAs('me')
    s().cancelRsvp(id)
    const ev = s().events.find((e) => e.id === id)!
    expect(ev.attendeeIds).toContain('u-guest')
    expect(ev.waitlistIds).not.toContain('u-guest')

    s().setViewAs('newStudent')
    expect(s().currentUser().rsvps).toContain(id)
    expect(s().unreadCount()).toBeGreaterThanOrEqual(1)
    expect(s().myNotifications()[0].kind).toBe('promotedFromWaitlist')
  })
})

describe('authorization guards (defense in depth)', () => {
  it('blocks a non-manager from editing, running the door, or approving', () => {
    const created = s().createEvent(arshEvent({ accessType: 'guestlist' }))
    if (!created.ok) throw new Error('setup failed')
    const id = created.event.id

    s().setViewAs('newStudent') // guest manages nothing
    expect(s().updateEvent(id, { title: 'Hijacked' }).ok).toBe(false)
    expect(s().toggleCheckIn(id, 'u-arsh').ok).toBe(false)
    expect(s().approveApplicant(id, 'u-arsh').ok).toBe(false)
    expect(s().approveMember('e-club', 'u-theo').ok).toBe(false)

    // The title was not changed by the blocked edit.
    expect(s().events.find((e) => e.id === id)!.title).toBe('Late Night Study Jam')
  })

  it('lets an individual host approve an applicant to their own guestlist event', () => {
    const created = s().createEvent(arshEvent({ accessType: 'guestlist' }))
    if (!created.ok) throw new Error('setup failed')

    s().setViewAs('newStudent')
    s().applyToEvent(created.event.id) // guest has no badge -> pending

    s().setViewAs('me') // arsh is the individual host (not a club admin)
    const r = s().approveApplicant(created.event.id, 'u-guest')
    expect(r.ok).toBe(true)
    expect(s().events.find((e) => e.id === created.event.id)!.attendeeIds).toContain('u-guest')
  })

  it('rejects posting as a club you do not admin, or as another person', () => {
    s().setViewAs('newStudent')
    const asClub = s().createEvent(arshEvent({ hostType: 'club', hostId: 'e-club', hostName: 'Hoagie Club' }))
    expect(asClub.ok).toBe(false)
    const asOther = s().createEvent(arshEvent()) // hostId u-arsh but current user is guest
    expect(asOther.ok).toBe(false)
  })

  it('only a club admin can approve members', () => {
    // Guest is not an admin of Hoagie Club - approval must be refused and a no-op.
    s().setViewAs('newStudent')
    const r = s().approveMember('e-club', 'u-theo')
    expect(r.ok).toBe(false)
    const club = s().clubs.find((c) => c.id === 'e-club')!
    expect(club.memberIds).not.toContain('u-theo') // u-theo was pending, still not a member
    expect(club.pendingIds).toContain('u-theo')
  })

  it('transferAdmin requires being an admin and a member target', () => {
    // A non-admin cannot transfer.
    s().setViewAs('newStudent')
    expect(s().transferAdmin('e-club', 'u-maya').ok).toBe(false)

    // Arsh (admin) can hand off to a member (u-maya); afterwards arsh is no longer admin.
    s().setViewAs('me')
    expect(s().transferAdmin('e-club', 'u-maya').ok).toBe(true)
    const club = s().clubs.find((c) => c.id === 'e-club')!
    expect(club.adminIds).toContain('u-maya')
    expect(club.adminIds).not.toContain('u-arsh')
    expect(s().users.find((u) => u.id === 'u-arsh')!.adminOf).not.toContain('e-club')
  })
})

describe('updateEvent time handling', () => {
  it('edits a past event when time is unchanged, but blocks a newly-invalid time', () => {
    const start = new Date(Date.now() - 3 * 86_400_000).toISOString()
    const end = new Date(Date.now() - 3 * 86_400_000 + 2 * 3_600_000).toISOString()
    const pastEvent: CampusEvent = {
      id: 'ev-past-test',
      title: 'Old Jam',
      description: '',
      hostType: 'individual',
      hostId: 'u-arsh',
      hostName: 'Arsh Parekh',
      buildingId: 'b-frist',
      start,
      end,
      accessType: 'open',
      tags: [],
      reservationConfirmed: false,
      attendeeIds: [],
      applicants: [],
    }
    useStore.setState((st) => ({ events: [...st.events, pastEvent] }))

    // The edit form re-sends the same start/end; a title change must still succeed.
    expect(s().updateEvent('ev-past-test', { title: 'Renamed', start, end }).ok).toBe(true)
    expect(s().events.find((e) => e.id === 'ev-past-test')!.title).toBe('Renamed')

    // Actually moving the event to a past time is rejected.
    const newStart = new Date(Date.now() - 2 * 86_400_000).toISOString()
    const newEnd = new Date(Date.now() - 2 * 86_400_000 + 2 * 3_600_000).toISOString()
    expect(s().updateEvent('ev-past-test', { start: newStart, end: newEnd }).ok).toBe(false)
  })
})

describe('createEvent validation', () => {
  it('rejects an invalid draft', () => {
    const r = s().createEvent(arshEvent({ title: 'ab' }))
    expect(r.ok).toBe(false)
    expect('error' in r && r.error).toBeTruthy()
  })

  it('rejects a double-booked confirmed reservation', () => {
    const first = s().createEvent(arshEvent({ reservationConfirmed: true }))
    expect(first.ok).toBe(true)
    const clash = s().createEvent(arshEvent({ reservationConfirmed: true }))
    expect(clash.ok).toBe(false)
    expect('conflict' in clash).toBe(true)
  })
})

describe('notifications fan-out', () => {
  it('notifies followers of a host when it posts a visible event', () => {
    // Guest follows Hoagie Club.
    s().setViewAs('newStudent')
    s().toggleFollow('e-club')

    // Arsh (an admin of Hoagie Club) posts an open event as the club.
    s().setViewAs('me')
    const created = s().createEvent(
      arshEvent({ hostType: 'club', hostId: 'e-club', hostName: 'Hoagie Club' }),
    )
    if (!created.ok) throw new Error('setup failed')

    s().setViewAs('newStudent')
    const got = s().myNotifications().find((n) => n.eventId === created.event.id)
    expect(got?.kind).toBe('newEventFromFollowed')
  })

  it('notifies a user when an admin approves their membership', () => {
    s().approveMember('e-club', 'u-theo')
    const notif = s().notifications.find(
      (n) => n.userId === 'u-theo' && n.kind === 'membershipApproved',
    )
    expect(notif).toBeTruthy()
  })

  it('notifies the host when someone requests a guestlist spot', () => {
    // Arsh (admin of Hoagie Club) posts a guestlist event as the club.
    const created = s().createEvent(
      arshEvent({
        hostType: 'club',
        hostId: 'e-club',
        hostName: 'Hoagie Club',
        accessType: 'guestlist',
      }),
    )
    if (!created.ok) throw new Error('setup failed')

    // A student with no Hoagie Club badge requests to attend -> pending.
    s().setViewAs('newStudent')
    const r = s().applyToEvent(created.event.id)
    expect(r.ok && r.status).toBe('pending')

    // The club's admin (arsh) gets a newApplication notification.
    const hostNotif = s().notifications.find(
      (n) => n.userId === 'u-arsh' && n.kind === 'newApplication' && n.eventId === created.event.id,
    )
    expect(hostNotif).toBeTruthy()
  })
})

describe('per-user follows and saves are isolated by viewer', () => {
  it('keeps follow state separate across viewAs', () => {
    s().toggleFollow('cannon') // as arsh
    expect(s().isFollowing('cannon')).toBe(true)
    s().setViewAs('newStudent')
    expect(s().isFollowing('cannon')).toBe(false)
  })

  it('saves events per user and lists them', () => {
    const anyEvent = s().visibleEvents()[0]
    s().toggleSave(anyEvent.id)
    expect(s().isSaved(anyEvent.id)).toBe(true)
    expect(s().savedEvents().map((e) => e.id)).toContain(anyEvent.id)
    s().setViewAs('newStudent')
    expect(s().isSaved(anyEvent.id)).toBe(false)
  })
})
