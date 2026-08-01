// src/store.ts
//
// The app's state layer. All demo data comes from src/data/seed.ts - this file
// never redefines a type or re-creates seed data; it clones the seed on init and
// mutates copies through immutable-friendly Zustand updates.

import { create } from 'zustand'
import {
  users as seedUsers,
  clubs as seedClubs,
  events as seedEvents,
  buildings,
  tags,
  CURRENT_USER_ID,
  buildingById,
  tagById,
} from './data/seed'
import type {
  User,
  Club,
  Building,
  CampusEvent,
  EventApplicant,
  ApplicantStatus,
} from './data/seed'
import { canSeeEvent } from './lib/visibility'

// Re-export the static lookups so UI can pull everything from the store module.
export { buildings, tags, buildingById, tagById }

// ---------------------------------------------------------------------------
// viewAs - pick the EFFECTIVE current user so we can demo perspectives without
// a login flow. Each mode maps to a concrete user id.
// ---------------------------------------------------------------------------

export type ViewAs = 'me' | 'clubAdmin' | 'newStudent'

const GUEST_ID = 'u-guest'

const VIEW_AS_TO_USER: Record<ViewAs, string> = {
  me: 'u-arsh', // eating-club member + E-Club admin
  clubAdmin: 'u-devin', // admin of Cannon and Table Tennis
  newStudent: GUEST_ID, // synthetic guest, no memberships
}

/** A fresh synthetic guest - class of 2029, no clubs, no history. */
function makeGuest(): User {
  return {
    id: GUEST_ID,
    name: 'Guest Student',
    classYear: 2029,
    avatarColor: '#808080',
    eatingClubId: undefined,
    clubMemberships: [],
    adminOf: [],
    rsvps: [],
    applications: [],
  }
}

// ---------------------------------------------------------------------------
// Fresh, deep-cloned collections. The imported seed arrays stay pristine so
// resetDemo() can always clone a clean copy.
// ---------------------------------------------------------------------------

const freshUsers = (): User[] => [...structuredClone(seedUsers), makeGuest()]
const freshClubs = (): Club[] => structuredClone(seedClubs)
const freshEvents = (): CampusEvent[] => structuredClone(seedEvents)

// Monotonic id source for events created during the session.
let createdCount = 0
const nextEventId = () => `ev-new-${(++createdCount).toString(36)}`

// ---------------------------------------------------------------------------
// Action result shapes
// ---------------------------------------------------------------------------

export type ActionResult = { ok: boolean; reason?: string }

export type ApplyResult =
  | { ok: true; status: Extract<ApplicantStatus, 'auto' | 'pending'> }
  | { ok: false; reason: string }

export type CreateEventInput = Omit<CampusEvent, 'id' | 'attendeeIds' | 'applicants'> & {
  attendeeIds?: string[]
  applicants?: EventApplicant[]
}

export type CreateResult =
  | { ok: true; event: CampusEvent }
  | { ok: false; conflict: CampusEvent }

/** Fields a host/admin can edit after posting. */
export type EventEdit = Partial<
  Pick<
    CampusEvent,
    | 'title'
    | 'description'
    | 'start'
    | 'end'
    | 'accessType'
    | 'tags'
    | 'reservationConfirmed'
    | 'capacity'
  >
>

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface AppState {
  // Mutable collections (cloned from seed)
  users: User[]
  clubs: Club[]
  events: CampusEvent[]

  // Identity / perspective
  currentUserId: string
  viewAs: ViewAs

  // Selectors
  currentUser: () => User
  eventsSorted: () => CampusEvent[]
  visibleEvents: () => CampusEvent[]
  recommendedEvents: () => CampusEvent[]
  eventsForUser: () => CampusEvent[]
  myClubs: () => Club[]

  // Actions
  setViewAs: (v: ViewAs) => void
  rsvp: (eventId: string) => ActionResult
  cancelRsvp: (eventId: string) => ActionResult
  applyToEvent: (eventId: string) => ApplyResult
  approveApplicant: (eventId: string, userId: string) => void
  denyApplicant: (eventId: string, userId: string) => void
  joinClub: (clubId: string) => void
  approveMember: (clubId: string, userId: string) => void
  denyMember: (clubId: string, userId: string) => void
  createEvent: (payload: CreateEventInput) => CreateResult
  updateEvent: (eventId: string, patch: EventEdit) => void
  toggleCheckIn: (eventId: string, userId: string) => void
  transferAdmin: (clubId: string, toUserId: string) => ActionResult
  addBuilding: (b: Building) => void
  resetDemo: () => void
}

// ---------------------------------------------------------------------------
// Small immutable helper: return a new array with the matching item replaced.
// ---------------------------------------------------------------------------

function replaceById<T extends { id: string }>(arr: T[], id: string, fn: (x: T) => T): T[] {
  return arr.map((x) => (x.id === id ? fn(x) : x))
}

/** Half-open [start, end) interval overlap on ISO strings (UTC → lexicographic). */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * The set of tags a user has an affinity for - drawn from events they RSVP'd to
 * plus events hosted by clubs they belong to (member, admin, or eating-club badge).
 * Shared by recommendedEvents() and eventsForUser() so the "For You" logic lives
 * in exactly one place.
 */
function affinityTags(me: User, events: CampusEvent[]): Set<string> {
  const myClubIds = new Set<string>([
    ...me.clubMemberships.map((m) => m.clubId),
    ...me.adminOf,
    ...(me.eatingClubId ? [me.eatingClubId] : []),
  ])
  const affinity = new Set<string>()
  for (const ev of events) {
    const fromRsvp = me.rsvps.includes(ev.id)
    const fromClub =
      (ev.hostType === 'club' || ev.hostType === 'eatingClub') && myClubIds.has(ev.hostId)
    if (fromRsvp || fromClub) ev.tags.forEach((t) => affinity.add(t))
  }
  return affinity
}

const matchesAffinity = (ev: CampusEvent, affinity: Set<string>): boolean =>
  ev.tags.some((t) => affinity.has(t))

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<AppState>((set, get) => ({
  users: freshUsers(),
  clubs: freshClubs(),
  events: freshEvents(),
  currentUserId: CURRENT_USER_ID,
  viewAs: 'me',

  // --- Selectors -----------------------------------------------------------

  currentUser: () => {
    const { viewAs, users } = get()
    const id = VIEW_AS_TO_USER[viewAs]
    return users.find((u) => u.id === id) ?? users[0]
  },

  eventsSorted: () =>
    [...get().events].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0)),

  /** Events the effective current user is allowed to discover, chronological. */
  visibleEvents: () => {
    const me = get().currentUser()
    return get().eventsSorted().filter((e) => canSeeEvent(e, me))
  },

  /**
   * The affinity-matching events only, chronological. These are the
   * "Recommended for you" rows on the feed. Only ever visible events.
   */
  recommendedEvents: () => {
    const byStart = get().visibleEvents()
    const affinity = affinityTags(get().currentUser(), byStart)
    return byStart.filter((ev) => matchesAffinity(ev, affinity))
  },

  /**
   * "For You" ordering: affinity-matching events first (chronological within the
   * group), then everything else chronological. Only ever visible events.
   */
  eventsForUser: () => {
    const byStart = get().visibleEvents()
    const affinity = affinityTags(get().currentUser(), byStart)
    return [
      ...byStart.filter((ev) => matchesAffinity(ev, affinity)),
      ...byStart.filter((ev) => !matchesAffinity(ev, affinity)),
    ]
  },

  myClubs: () => {
    const me = get().currentUser()
    return get().clubs.filter((c) => c.memberIds.includes(me.id) || c.adminIds.includes(me.id))
  },

  // --- Actions -------------------------------------------------------------

  setViewAs: (v) => set({ viewAs: v, currentUserId: VIEW_AS_TO_USER[v] }),

  rsvp: (eventId) => {
    const me = get().currentUser()
    const ev = get().events.find((e) => e.id === eventId)
    if (!ev) return { ok: false, reason: 'Event not found.' }
    if (ev.attendeeIds.includes(me.id)) return { ok: true }
    if (ev.capacity !== undefined && ev.attendeeIds.length >= ev.capacity) {
      return { ok: false, reason: 'This event is at capacity.' }
    }
    set((state) => ({
      events: replaceById(state.events, eventId, (e) => ({
        ...e,
        attendeeIds: [...e.attendeeIds, me.id],
      })),
      users: replaceById(state.users, me.id, (u) => ({ ...u, rsvps: [...u.rsvps, eventId] })),
    }))
    return { ok: true }
  },

  cancelRsvp: (eventId) => {
    const me = get().currentUser()
    set((state) => ({
      events: replaceById(state.events, eventId, (e) => ({
        ...e,
        attendeeIds: e.attendeeIds.filter((id) => id !== me.id),
      })),
      users: replaceById(state.users, me.id, (u) => ({
        ...u,
        rsvps: u.rsvps.filter((id) => id !== eventId),
      })),
    }))
    return { ok: true }
  },

  applyToEvent: (eventId) => {
    const me = get().currentUser()
    const ev = get().events.find((e) => e.id === eventId)
    if (!ev) return { ok: false, reason: 'Event not found.' }
    if (ev.accessType !== 'guestlist') {
      return { ok: false, reason: 'This event does not use a guestlist.' }
    }
    if (ev.applicants.some((a) => a.userId === me.id)) {
      return { ok: false, reason: 'You already applied to this event.' }
    }

    // The user "holds the host club's badge" when the host is a club/eatingClub
    // AND they are a confirmed member of it (eating-club badge or member status).
    const holdsBadge =
      (ev.hostType === 'club' || ev.hostType === 'eatingClub') &&
      (me.eatingClubId === ev.hostId ||
        me.clubMemberships.some((m) => m.clubId === ev.hostId && m.status === 'member'))

    const status: Extract<ApplicantStatus, 'auto' | 'pending'> = holdsBadge ? 'auto' : 'pending'

    set((state) => ({
      events: replaceById(state.events, eventId, (e) => ({
        ...e,
        applicants: [...e.applicants, { userId: me.id, status }],
        attendeeIds:
          holdsBadge && !e.attendeeIds.includes(me.id)
            ? [...e.attendeeIds, me.id]
            : e.attendeeIds,
      })),
      users: replaceById(state.users, me.id, (u) => ({
        ...u,
        applications: [...u.applications, { eventId, status }],
      })),
    }))
    return { ok: true, status }
  },

  approveApplicant: (eventId, userId) =>
    set((state) => ({
      events: replaceById(state.events, eventId, (e) => ({
        ...e,
        applicants: e.applicants.map((a) =>
          a.userId === userId ? { ...a, status: 'approved' } : a,
        ),
        attendeeIds: e.attendeeIds.includes(userId)
          ? e.attendeeIds
          : [...e.attendeeIds, userId],
      })),
      users: replaceById(state.users, userId, (u) => ({
        ...u,
        applications: u.applications.map((ap) =>
          ap.eventId === eventId ? { ...ap, status: 'approved' } : ap,
        ),
      })),
    })),

  denyApplicant: (eventId, userId) =>
    set((state) => ({
      events: replaceById(state.events, eventId, (e) => ({
        ...e,
        applicants: e.applicants.filter((a) => a.userId !== userId),
        attendeeIds: e.attendeeIds.filter((id) => id !== userId),
      })),
      users: replaceById(state.users, userId, (u) => ({
        ...u,
        applications: u.applications.filter((ap) => ap.eventId !== eventId),
      })),
    })),

  joinClub: (clubId) => {
    const me = get().currentUser()
    set((state) => ({
      clubs: replaceById(state.clubs, clubId, (c) => ({
        ...c,
        pendingIds: c.pendingIds.includes(me.id) ? c.pendingIds : [...c.pendingIds, me.id],
      })),
      users: replaceById(state.users, me.id, (u) => ({
        ...u,
        clubMemberships: u.clubMemberships.some((m) => m.clubId === clubId)
          ? u.clubMemberships
          : [...u.clubMemberships, { clubId, status: 'pending' }],
      })),
    }))
  },

  approveMember: (clubId, userId) =>
    // Granting the badge: this user becomes a confirmed member, so future
    // guestlist events hosted by this club auto-accept them (see applyToEvent).
    set((state) => ({
      clubs: replaceById(state.clubs, clubId, (c) => ({
        ...c,
        pendingIds: c.pendingIds.filter((id) => id !== userId),
        memberIds: c.memberIds.includes(userId) ? c.memberIds : [...c.memberIds, userId],
      })),
      users: replaceById(state.users, userId, (u) => ({
        ...u,
        clubMemberships: u.clubMemberships.some((m) => m.clubId === clubId)
          ? u.clubMemberships.map((m) => (m.clubId === clubId ? { ...m, status: 'member' } : m))
          : [...u.clubMemberships, { clubId, status: 'member' }],
      })),
    })),

  denyMember: (clubId, userId) =>
    set((state) => ({
      clubs: replaceById(state.clubs, clubId, (c) => ({
        ...c,
        pendingIds: c.pendingIds.filter((id) => id !== userId),
      })),
      users: replaceById(state.users, userId, (u) => ({
        ...u,
        clubMemberships: u.clubMemberships.filter(
          (m) => !(m.clubId === clubId && m.status === 'pending'),
        ),
      })),
    })),

  createEvent: (payload) => {
    if (payload.reservationConfirmed) {
      const conflict = get().events.find(
        (e) =>
          e.buildingId === payload.buildingId &&
          e.reservationConfirmed &&
          overlaps(payload.start, payload.end, e.start, e.end),
      )
      if (conflict) return { ok: false, conflict }
    }
    const event: CampusEvent = {
      ...payload,
      id: nextEventId(),
      attendeeIds: payload.attendeeIds ?? [],
      applicants: payload.applicants ?? [],
    }
    set((state) => ({ events: [...state.events, event] }))
    return { ok: true, event }
  },

  updateEvent: (eventId, patch) =>
    set((state) => ({
      events: replaceById(state.events, eventId, (e) => ({ ...e, ...patch })),
    })),

  // Door check-in: flip whether an attendee has been checked in at the event.
  toggleCheckIn: (eventId, userId) =>
    set((state) => ({
      events: replaceById(state.events, eventId, (e) => {
        const set = e.checkedInIds ?? []
        return {
          ...e,
          checkedInIds: set.includes(userId)
            ? set.filter((id) => id !== userId)
            : [...set, userId],
        }
      }),
    })),

  transferAdmin: (clubId, toUserId) => {
    const me = get().currentUser()
    set((state) => ({
      clubs: replaceById(state.clubs, clubId, (c) => ({
        ...c,
        adminIds: [...c.adminIds.filter((id) => id !== me.id && id !== toUserId), toUserId],
        memberIds: c.memberIds.includes(toUserId) ? c.memberIds : [...c.memberIds, toUserId],
      })),
      users: state.users.map((u) => {
        if (u.id === me.id) return { ...u, adminOf: u.adminOf.filter((id) => id !== clubId) }
        if (u.id === toUserId)
          return {
            ...u,
            adminOf: u.adminOf.includes(clubId) ? u.adminOf : [...u.adminOf, clubId],
          }
        return u
      }),
    }))
    return { ok: true }
  },

  // Register an ad-hoc location (from "Create event" → custom place). We write it
  // into the shared buildingById lookup so every consumer (cards, detail, map)
  // resolves it; the next store update re-renders them with the name in place.
  addBuilding: (b) => {
    buildingById[b.id] = b
  },

  resetDemo: () =>
    set({
      users: freshUsers(),
      clubs: freshClubs(),
      events: freshEvents(),
      viewAs: 'me',
      currentUserId: CURRENT_USER_ID,
    }),
}))
