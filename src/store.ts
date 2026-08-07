// src/store.ts
//
// The app's state layer. All demo data comes from src/data/seed.ts - this file
// never redefines a type or re-creates seed data; it clones the seed on init and
// mutates copies through immutable-friendly Zustand updates.
//
// State is PERSISTED to localStorage (zustand `persist`), so created events,
// RSVPs, follows, saves, check-ins and notifications survive a reload - the app
// behaves like a real product rather than resetting on refresh. `resetDemo()`
// wipes back to a clean seed.
//
// Every mutating action is AUTHORIZED here (defense in depth): the store refuses
// to edit an event, run a door, or approve into a club unless the effective user
// is actually a host/admin - even if a buggy or tampered UI tried to. This mirrors
// the row-level-security rules a real backend would enforce (see supabase/).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
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
  EventComment,
  ApplicantStatus,
} from './data/seed'
import { canSeeEvent, canManageEvent } from './lib/visibility'
import {
  sanitizeText,
  sanitizeSingleLine,
  clampInt,
  validateEventDraft,
  hasErrors,
  LIMITS,
} from './lib/validation'
import type { AppNotification, NotificationKind } from './lib/notifications'

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

// Collision-free ids. A module counter alone would reset on reload and clash
// with already-persisted `ev-new-1` etc., so we base ids on a UUID (with a
// timestamp+random fallback for very old runtimes).
let idSeq = 0
function uid(prefix: string): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  const rand = c?.randomUUID
    ? c.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${(++idSeq).toString(36)}`
  return `${prefix}-${rand}`
}
const nextEventId = () => uid('ev-new')
const nextNotifId = () => uid('n')
const nextCommentId = () => uid('c')

function makeNotif(
  userId: string,
  kind: NotificationKind,
  fields: Partial<Pick<AppNotification, 'title' | 'body' | 'eventId' | 'clubId'>>,
): AppNotification {
  return {
    id: nextNotifId(),
    userId,
    kind,
    title: fields.title ?? '',
    body: fields.body ?? '',
    eventId: fields.eventId,
    clubId: fields.clubId,
    ts: Date.now(),
    read: false,
  }
}

/**
 * A small, data-derived set of starter notifications so the bell is alive on
 * first open: "new from a club you're in". Derived entirely from real seed ids,
 * so it never dangles.
 */
function seedNotifications(usersArr: User[], eventsArr: CampusEvent[]): AppNotification[] {
  const me = usersArr.find((u) => u.id === CURRENT_USER_ID)
  if (!me) return []
  const myClubIds = new Set<string>([
    ...me.clubMemberships.filter((m) => m.status === 'member').map((m) => m.clubId),
    ...me.adminOf,
    ...(me.eatingClubId ? [me.eatingClubId] : []),
  ])
  const soon = eventsArr
    .filter(
      (e) =>
        (e.hostType === 'club' || e.hostType === 'eatingClub') &&
        myClubIds.has(e.hostId) &&
        !e.attendeeIds.includes(me.id) &&
        new Date(e.start).getTime() >= Date.now(),
    )
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, 2)

  return soon.map((e, i) => ({
    ...makeNotif(me.id, 'newEventFromFollowed', {
      title: `New from ${e.hostName}`,
      body: e.title,
      eventId: e.id,
      clubId: e.hostId,
    }),
    // stagger into the recent past so the timestamps read naturally
    ts: Date.now() - (i + 1) * 3_600_000,
  }))
}

// A few starter comments so an event's discussion isn't empty on first open.
// Derived from real attendee ids on upcoming events, so nothing dangles.
const COMMENT_BODIES = [
  'Pulling up for sure.',
  'Is there a coat check?',
  'Can I bring a +1?',
  'What time does the line usually die down?',
  'Been waiting all week for this.',
  'Do we need our badge at the door?',
]
function seedComments(eventsArr: CampusEvent[]): EventComment[] {
  const upcoming = eventsArr
    .filter((e) => new Date(e.start).getTime() >= Date.now() && e.attendeeIds.length >= 2)
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, 2)
  const out: EventComment[] = []
  upcoming.forEach((e, ei) => {
    e.attendeeIds.slice(0, 2).forEach((userId, ci) => {
      out.push({
        id: `c-seed-${ei}-${ci}`,
        eventId: e.id,
        userId,
        body: COMMENT_BODIES[(ei * 2 + ci) % COMMENT_BODIES.length],
        ts: Date.now() - (out.length + 1) * 1_800_000,
      })
    })
  })
  return out
}

// ---------------------------------------------------------------------------
// Action result shapes
// ---------------------------------------------------------------------------

export type ActionResult = { ok: boolean; reason?: string; waitlisted?: boolean }

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
  | { ok: false; error: string }

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
  /** Ad-hoc locations created during the session (persisted; merged into buildingById). */
  customBuildings: Building[]

  // Identity / perspective
  currentUserId: string
  viewAs: ViewAs

  // Per-user social graph + activity (keyed by user id so each viewAs is coherent)
  followingByUser: Record<string, string[]>
  savedByUser: Record<string, string[]>
  notifications: AppNotification[]
  comments: EventComment[]

  // Selectors
  currentUser: () => User
  eventsSorted: () => CampusEvent[]
  visibleEvents: () => CampusEvent[]
  recommendedEvents: () => CampusEvent[]
  eventsForUser: () => CampusEvent[]
  myClubs: () => Club[]
  myFollowing: () => string[]
  isFollowing: (id: string) => boolean
  mySaved: () => string[]
  isSaved: (eventId: string) => boolean
  savedEvents: () => CampusEvent[]
  myNotifications: () => AppNotification[]
  unreadCount: () => number
  commentsForEvent: (eventId: string) => EventComment[]

  // Actions
  setViewAs: (v: ViewAs) => void
  rsvp: (eventId: string) => ActionResult
  cancelRsvp: (eventId: string) => ActionResult
  applyToEvent: (eventId: string) => ApplyResult
  withdrawApplication: (eventId: string) => ActionResult
  approveApplicant: (eventId: string, userId: string) => ActionResult
  denyApplicant: (eventId: string, userId: string) => ActionResult
  joinClub: (clubId: string) => void
  leaveClub: (clubId: string) => ActionResult
  approveMember: (clubId: string, userId: string) => ActionResult
  denyMember: (clubId: string, userId: string) => ActionResult
  createEvent: (payload: CreateEventInput) => CreateResult
  updateEvent: (eventId: string, patch: EventEdit) => ActionResult
  deleteEvent: (eventId: string) => ActionResult
  addComment: (eventId: string, body: string) => ActionResult
  deleteComment: (commentId: string) => ActionResult
  toggleCheckIn: (eventId: string, userId: string) => ActionResult
  toggleFollow: (id: string) => void
  toggleSave: (eventId: string) => void
  markAllNotificationsRead: () => void
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

/**
 * "For You" relevance: an event matches your tag affinity, OR someone you follow
 * is going. This is what pulls the follow graph into the feed (not just notifs).
 */
const isRecommended = (
  ev: CampusEvent,
  affinity: Set<string>,
  following: Set<string>,
): boolean => matchesAffinity(ev, affinity) || ev.attendeeIds.some((id) => following.has(id))

/** Everyone who follows `targetId` (a club or user), for fan-out notifications. */
function followersOf(followingByUser: Record<string, string[]>, targetId: string): string[] {
  const out: string[] = []
  for (const [uid, list] of Object.entries(followingByUser)) {
    if (list.includes(targetId)) out.push(uid)
  }
  return out
}

// ---------------------------------------------------------------------------
// Storage: localStorage in the browser, an in-memory shim elsewhere (tests/SSR)
// so store creation never throws when `localStorage` is absent.
// ---------------------------------------------------------------------------

function makeStorage() {
  if (typeof localStorage !== 'undefined') return localStorage
  const mem = new Map<string, string>()
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function initialState() {
  const users = freshUsers()
  const events = freshEvents()
  return {
    users,
    clubs: freshClubs(),
    events,
    customBuildings: [] as Building[],
    currentUserId: CURRENT_USER_ID,
    viewAs: 'me' as ViewAs,
    followingByUser: {} as Record<string, string[]>,
    savedByUser: {} as Record<string, string[]>,
    notifications: seedNotifications(users, events),
    comments: seedComments(events),
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      // --- Selectors ---------------------------------------------------------

      currentUser: () => {
        const { viewAs, users } = get()
        const id = VIEW_AS_TO_USER[viewAs]
        return users.find((u) => u.id === id) ?? users[0]
      },

      eventsSorted: () =>
        [...get().events].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0)),

      visibleEvents: () => {
        const me = get().currentUser()
        return get().eventsSorted().filter((e) => canSeeEvent(e, me))
      },

      recommendedEvents: () => {
        const byStart = get().visibleEvents()
        const me = get().currentUser()
        const affinity = affinityTags(me, byStart)
        const following = new Set(get().followingByUser[me.id] ?? [])
        return byStart.filter((ev) => isRecommended(ev, affinity, following))
      },

      eventsForUser: () => {
        const byStart = get().visibleEvents()
        const me = get().currentUser()
        const affinity = affinityTags(me, byStart)
        const following = new Set(get().followingByUser[me.id] ?? [])
        return [
          ...byStart.filter((ev) => isRecommended(ev, affinity, following)),
          ...byStart.filter((ev) => !isRecommended(ev, affinity, following)),
        ]
      },

      myClubs: () => {
        const me = get().currentUser()
        return get().clubs.filter((c) => c.memberIds.includes(me.id) || c.adminIds.includes(me.id))
      },

      myFollowing: () => get().followingByUser[get().currentUser().id] ?? [],
      isFollowing: (id) => (get().followingByUser[get().currentUser().id] ?? []).includes(id),

      mySaved: () => get().savedByUser[get().currentUser().id] ?? [],
      isSaved: (eventId) => (get().savedByUser[get().currentUser().id] ?? []).includes(eventId),
      savedEvents: () => {
        const saved = new Set(get().mySaved())
        return get().visibleEvents().filter((e) => saved.has(e.id))
      },

      myNotifications: () => {
        const meId = get().currentUser().id
        return get()
          .notifications.filter((n) => n.userId === meId)
          .sort((a, b) => b.ts - a.ts)
      },
      unreadCount: () => {
        const meId = get().currentUser().id
        return get().notifications.filter((n) => n.userId === meId && !n.read).length
      },
      commentsForEvent: (eventId) =>
        get()
          .comments.filter((c) => c.eventId === eventId)
          .sort((a, b) => a.ts - b.ts),

      // --- Actions -----------------------------------------------------------

      setViewAs: (v) => set({ viewAs: v, currentUserId: VIEW_AS_TO_USER[v] }),

      rsvp: (eventId) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canSeeEvent(ev, me)) return { ok: false, reason: 'This event is private.' }
        if (ev.attendeeIds.includes(me.id)) return { ok: true }

        const full = ev.capacity !== undefined && ev.attendeeIds.length >= ev.capacity
        if (full) {
          if ((ev.waitlistIds ?? []).includes(me.id)) return { ok: true, waitlisted: true }
          set((state) => ({
            events: replaceById(state.events, eventId, (e) => ({
              ...e,
              waitlistIds: [...(e.waitlistIds ?? []), me.id],
            })),
          }))
          return {
            ok: false,
            waitlisted: true,
            reason: "This event is full - you're on the waitlist.",
          }
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
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        const wasAttending = ev.attendeeIds.includes(me.id)

        set((state) => {
          const newNotifs: AppNotification[] = []
          const events = replaceById(state.events, eventId, (e) => {
            let attendeeIds = e.attendeeIds.filter((id) => id !== me.id)
            let waitlistIds = (e.waitlistIds ?? []).filter((id) => id !== me.id)
            const checkedInIds = (e.checkedInIds ?? []).filter((id) => id !== me.id)

            // A seat opened: promote the first person waiting, if any.
            const hasRoom = e.capacity === undefined || attendeeIds.length < e.capacity
            let promoted: string | undefined
            if (wasAttending && hasRoom && waitlistIds.length > 0) {
              promoted = waitlistIds[0]
              waitlistIds = waitlistIds.slice(1)
              attendeeIds = [...attendeeIds, promoted]
              newNotifs.push(
                makeNotif(promoted, 'promotedFromWaitlist', {
                  title: 'A spot opened up',
                  body: `You're off the waitlist for ${e.title}.`,
                  eventId: e.id,
                }),
              )
            }
            return { ...e, attendeeIds, waitlistIds, checkedInIds }
          })

          // Keep the promoted user's own rsvps list in sync.
          const promotedId = newNotifs[0]?.userId
          const users = promotedId
            ? replaceById(state.users, promotedId, (u) => ({
                ...u,
                rsvps: u.rsvps.includes(eventId) ? u.rsvps : [...u.rsvps, eventId],
              }))
            : state.users

          return {
            events,
            users: replaceById(users, me.id, (u) => ({
              ...u,
              rsvps: u.rsvps.filter((id) => id !== eventId),
            })),
            notifications: [...state.notifications, ...newNotifs],
          }
        })
        return { ok: true }
      },

      applyToEvent: (eventId) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canSeeEvent(ev, me)) return { ok: false, reason: 'This event is private.' }
        if (ev.accessType !== 'guestlist') {
          return { ok: false, reason: 'This event does not use a guestlist.' }
        }
        if (ev.applicants.some((a) => a.userId === me.id)) {
          return { ok: false, reason: 'You already applied to this event.' }
        }

        const holdsBadge =
          (ev.hostType === 'club' || ev.hostType === 'eatingClub') &&
          (me.eatingClubId === ev.hostId ||
            me.clubMemberships.some((m) => m.clubId === ev.hostId && m.status === 'member'))

        const status: Extract<ApplicantStatus, 'auto' | 'pending'> = holdsBadge ? 'auto' : 'pending'

        set((state) => {
          // A pending request needs a manager's attention - notify them.
          const managerIds =
            ev.hostType === 'individual'
              ? [ev.hostId]
              : state.users.filter((u) => u.adminOf.includes(ev.hostId)).map((u) => u.id)
          const notifs =
            status === 'pending'
              ? managerIds
                  .filter((id) => id !== me.id)
                  .map((id) =>
                    makeNotif(id, 'newApplication', {
                      title: 'New request to attend',
                      body: `${me.name} wants to join ${ev.title}.`,
                      eventId,
                    }),
                  )
              : []
          return {
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
            notifications: [...state.notifications, ...notifs],
          }
        })
        return { ok: true, status }
      },

      // Withdraw your own guestlist application (whether pending or accepted).
      withdrawApplication: (eventId) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!ev.applicants.some((a) => a.userId === me.id) && !ev.attendeeIds.includes(me.id)) {
          return { ok: false, reason: "You're not on this list." }
        }
        set((state) => ({
          events: replaceById(state.events, eventId, (e) => ({
            ...e,
            applicants: e.applicants.filter((a) => a.userId !== me.id),
            attendeeIds: e.attendeeIds.filter((id) => id !== me.id),
            checkedInIds: (e.checkedInIds ?? []).filter((id) => id !== me.id),
          })),
          users: replaceById(state.users, me.id, (u) => ({
            ...u,
            applications: u.applications.filter((ap) => ap.eventId !== eventId),
            rsvps: u.rsvps.filter((id) => id !== eventId),
          })),
        }))
        return { ok: true }
      },

      approveApplicant: (eventId, userId) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canManageEvent(ev, me)) return { ok: false, reason: 'Only the host can do that.' }
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
          notifications: [
            ...state.notifications,
            makeNotif(userId, 'applicationApproved', {
              title: "You're on the list",
              body: `Approved for ${ev.title}.`,
              eventId,
            }),
          ],
        }))
        return { ok: true }
      },

      denyApplicant: (eventId, userId) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canManageEvent(ev, me)) return { ok: false, reason: 'Only the host can do that.' }
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
          notifications: [
            ...state.notifications,
            makeNotif(userId, 'applicationDenied', {
              title: 'Request not approved',
              body: `Your request for ${ev.title} wasn't approved.`,
              eventId,
            }),
          ],
        }))
        return { ok: true }
      },

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

      // Leave a club (or cancel a pending request). Admins must pass admin first.
      leaveClub: (clubId) => {
        const me = get().currentUser()
        const club = get().clubs.find((c) => c.id === clubId)
        if (!club) return { ok: false, reason: 'Club not found.' }
        if (club.adminIds.includes(me.id)) {
          return { ok: false, reason: 'Pass admin to another member before leaving.' }
        }
        set((state) => ({
          clubs: replaceById(state.clubs, clubId, (c) => ({
            ...c,
            memberIds: c.memberIds.filter((id) => id !== me.id),
            pendingIds: c.pendingIds.filter((id) => id !== me.id),
          })),
          users: replaceById(state.users, me.id, (u) => ({
            ...u,
            clubMemberships: u.clubMemberships.filter((m) => m.clubId !== clubId),
            eatingClubId: u.eatingClubId === clubId ? undefined : u.eatingClubId,
          })),
        }))
        return { ok: true }
      },

      approveMember: (clubId, userId) => {
        const me = get().currentUser()
        const club = get().clubs.find((c) => c.id === clubId)
        if (!club) return { ok: false, reason: 'Club not found.' }
        if (!me.adminOf.includes(clubId)) return { ok: false, reason: 'Only an admin can do that.' }
        set((state) => ({
          clubs: replaceById(state.clubs, clubId, (c) => ({
            ...c,
            pendingIds: c.pendingIds.filter((id) => id !== userId),
            memberIds: c.memberIds.includes(userId) ? c.memberIds : [...c.memberIds, userId],
          })),
          users: replaceById(state.users, userId, (u) => ({
            ...u,
            clubMemberships: u.clubMemberships.some((m) => m.clubId === clubId)
              ? u.clubMemberships.map((m) =>
                  m.clubId === clubId ? { ...m, status: 'member' } : m,
                )
              : [...u.clubMemberships, { clubId, status: 'member' }],
          })),
          notifications: [
            ...state.notifications,
            makeNotif(userId, 'membershipApproved', {
              title: `Welcome to ${club.name}`,
              body: "You're now a member.",
              clubId,
            }),
          ],
        }))
        return { ok: true }
      },

      denyMember: (clubId, userId) => {
        const me = get().currentUser()
        if (!me.adminOf.includes(clubId)) return { ok: false, reason: 'Only an admin can do that.' }
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
        }))
        return { ok: true }
      },

      createEvent: (payload) => {
        const me = get().currentUser()

        // Authorization: club posts require admin of that club; individual posts
        // must be as yourself. (The form already enforces this; this is the backstop.)
        if (
          (payload.hostType === 'club' || payload.hostType === 'eatingClub') &&
          !me.adminOf.includes(payload.hostId)
        ) {
          return { ok: false, error: 'Only an admin of this club can post as it.' }
        }
        if (payload.hostType === 'individual' && payload.hostId !== me.id) {
          return { ok: false, error: 'You can only post your own events.' }
        }

        // Sanitize + validate.
        const title = sanitizeSingleLine(payload.title)
        const description = sanitizeText(payload.description)
        const capacity =
          payload.capacity !== undefined
            ? clampInt(payload.capacity, LIMITS.capacityMin, LIMITS.capacityMax)
            : undefined
        const errs = validateEventDraft({
          title,
          description,
          location: buildingById[payload.buildingId]?.name ?? payload.buildingId,
          start: payload.start,
          end: payload.end,
          capacity,
        })
        if (hasErrors(errs)) return { ok: false, error: Object.values(errs)[0] as string }

        // Reservation conflict check (a confirmed reservation locks the room+time).
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
          title,
          description,
          capacity,
          id: nextEventId(),
          attendeeIds: payload.attendeeIds ?? [],
          applicants: payload.applicants ?? [],
          waitlistIds: [],
        }

        set((state) => {
          // Fan out "new event" to followers of the host who can actually see it.
          const followers = followersOf(state.followingByUser, event.hostId).filter(
            (uid) => uid !== me.id,
          )
          const recipients = state.users.filter(
            (u) => followers.includes(u.id) && canSeeEvent(event, u),
          )
          const notifs = recipients.map((u) =>
            makeNotif(u.id, 'newEventFromFollowed', {
              title: `New from ${event.hostName}`,
              body: event.title,
              eventId: event.id,
              clubId: event.hostType !== 'individual' ? event.hostId : undefined,
            }),
          )
          return { events: [...state.events, event], notifications: [...state.notifications, ...notifs] }
        })
        return { ok: true, event }
      },

      updateEvent: (eventId, patch) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canManageEvent(ev, me)) return { ok: false, reason: 'Only the host can edit this.' }

        // Sanitize any text/number fields being changed.
        const clean: EventEdit = { ...patch }
        if (clean.title !== undefined) clean.title = sanitizeSingleLine(clean.title)
        if (clean.description !== undefined) clean.description = sanitizeText(clean.description)
        if (clean.capacity !== undefined)
          clean.capacity = clampInt(clean.capacity, LIMITS.capacityMin, LIMITS.capacityMax)

        // Validate the resulting event still makes sense.
        const merged = { ...ev, ...clean }
        const errs = validateEventDraft({
          title: merged.title,
          description: merged.description,
          location: buildingById[merged.buildingId]?.name ?? merged.buildingId,
          start: merged.start,
          end: merged.end,
          capacity: merged.capacity,
        })
        // The edit form always re-sends start/end, so only re-validate the time when
        // it ACTUALLY changed - otherwise fixing a typo on an event that has already
        // started would be blocked by the "in the past" rule.
        const timeChanged =
          (clean.start !== undefined && clean.start !== ev.start) ||
          (clean.end !== undefined && clean.end !== ev.end)
        const relevant = (['title', 'description', 'capacity'] as const).filter(
          (k) => clean[k] !== undefined,
        )
        const blocking = relevant.some((k) => errs[k]) || (timeChanged && errs.time)
        if (blocking)
          return { ok: false, reason: errs.title ?? errs.time ?? errs.capacity ?? errs.description }

        set((state) => {
          const notifs = timeChanged
            ? state.events
                .find((e) => e.id === eventId)!
                .attendeeIds.filter((uid) => uid !== me.id)
                .map((uid) =>
                  makeNotif(uid, 'eventUpdated', {
                    title: 'Time changed',
                    body: `${merged.title} was rescheduled.`,
                    eventId,
                  }),
                )
            : []
          return {
            events: replaceById(state.events, eventId, (e) => ({ ...e, ...clean })),
            notifications: [...state.notifications, ...notifs],
          }
        })
        return { ok: true }
      },

      // Cancel/delete an event (host or club admin). Attendees are notified and
      // every dangling rsvp/application/notification reference is cleaned up.
      deleteEvent: (eventId) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canManageEvent(ev, me)) return { ok: false, reason: 'Only the host can cancel this.' }
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
          comments: state.comments.filter((c) => c.eventId !== eventId),
          users: state.users.map((u) => ({
            ...u,
            rsvps: u.rsvps.filter((id) => id !== eventId),
            applications: u.applications.filter((a) => a.eventId !== eventId),
          })),
          // Drop the dead event id from everyone's saved lists.
          savedByUser: Object.fromEntries(
            Object.entries(state.savedByUser).map(([uid, ids]) => [
              uid,
              ids.filter((id) => id !== eventId),
            ]),
          ),
          notifications: [
            // Drop notifications that pointed at the now-deleted event...
            ...state.notifications.filter((n) => n.eventId !== eventId),
            // ...and tell attendees it was canceled (no eventId - it's gone).
            ...ev.attendeeIds
              .filter((id) => id !== me.id)
              .map((id) =>
                makeNotif(id, 'eventUpdated', {
                  title: 'Event canceled',
                  body: `${ev.title} was canceled by the host.`,
                }),
              ),
          ],
        }))
        return { ok: true }
      },

      // Post a comment on an event's discussion (anyone who can see the event).
      addComment: (eventId, body) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canSeeEvent(ev, me)) return { ok: false, reason: 'This event is private.' }
        const clean = sanitizeText(body)
        if (clean.length === 0) return { ok: false, reason: 'Write something first.' }
        if (clean.length > LIMITS.commentMax) {
          return { ok: false, reason: `Keep comments under ${LIMITS.commentMax} characters.` }
        }
        set((state) => {
          // Let the event's host(s) know about a new comment (not their own).
          const managerIds =
            ev.hostType === 'individual'
              ? [ev.hostId]
              : state.users.filter((u) => u.adminOf.includes(ev.hostId)).map((u) => u.id)
          const notifs = managerIds
            .filter((id) => id !== me.id)
            .map((id) =>
              makeNotif(id, 'newComment', {
                title: 'New comment',
                body: `${me.name} commented on ${ev.title}.`,
                eventId,
              }),
            )
          return {
            comments: [
              ...state.comments,
              { id: nextCommentId(), eventId, userId: me.id, body: clean, ts: Date.now() },
            ],
            notifications: [...state.notifications, ...notifs],
          }
        })
        return { ok: true }
      },

      // Delete a comment (its author, or the event's host/admin can moderate).
      deleteComment: (commentId) => {
        const me = get().currentUser()
        const comment = get().comments.find((c) => c.id === commentId)
        if (!comment) return { ok: false, reason: 'Comment not found.' }
        const ev = get().events.find((e) => e.id === comment.eventId)
        const allowed = comment.userId === me.id || (ev ? canManageEvent(ev, me) : false)
        if (!allowed) return { ok: false, reason: 'You can only delete your own comments.' }
        set((state) => ({ comments: state.comments.filter((c) => c.id !== commentId) }))
        return { ok: true }
      },

      toggleCheckIn: (eventId, userId) => {
        const me = get().currentUser()
        const ev = get().events.find((e) => e.id === eventId)
        if (!ev) return { ok: false, reason: 'Event not found.' }
        if (!canManageEvent(ev, me)) return { ok: false, reason: 'Only the host runs the door.' }
        set((state) => ({
          events: replaceById(state.events, eventId, (e) => {
            const list = e.checkedInIds ?? []
            return {
              ...e,
              checkedInIds: list.includes(userId)
                ? list.filter((id) => id !== userId)
                : [...list, userId],
            }
          }),
        }))
        return { ok: true }
      },

      toggleFollow: (id) =>
        set((state) => {
          const meId = get().currentUser().id
          if (id === meId) return {}
          const list = state.followingByUser[meId] ?? []
          const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
          return { followingByUser: { ...state.followingByUser, [meId]: next } }
        }),

      toggleSave: (eventId) =>
        set((state) => {
          const meId = get().currentUser().id
          const list = state.savedByUser[meId] ?? []
          const next = list.includes(eventId)
            ? list.filter((x) => x !== eventId)
            : [...list, eventId]
          return { savedByUser: { ...state.savedByUser, [meId]: next } }
        }),

      markAllNotificationsRead: () =>
        set((state) => {
          const meId = get().currentUser().id
          if (!state.notifications.some((n) => n.userId === meId && !n.read)) return {}
          return {
            notifications: state.notifications.map((n) =>
              n.userId === meId && !n.read ? { ...n, read: true } : n,
            ),
          }
        }),

      transferAdmin: (clubId, toUserId) => {
        const me = get().currentUser()
        const club = get().clubs.find((c) => c.id === clubId)
        if (!club) return { ok: false, reason: 'Club not found.' }
        if (!me.adminOf.includes(clubId)) return { ok: false, reason: 'Only an admin can do that.' }
        if (!club.memberIds.includes(toUserId))
          return { ok: false, reason: 'Pick a member of this club.' }
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

      // Register an ad-hoc location (from "Create event" → custom place). We write
      // it into the shared buildingById lookup AND persist it in customBuildings so
      // it survives a reload.
      addBuilding: (b) => {
        buildingById[b.id] = b
        set((state) =>
          state.customBuildings.some((x) => x.id === b.id)
            ? {}
            : { customBuildings: [...state.customBuildings, b] },
        )
      },

      resetDemo: () => set({ ...initialState() }),
    }),
    {
      name: 'hoagiefunctions-state',
      version: 1,
      storage: createJSONStorage(makeStorage),
      partialize: (s) => ({
        users: s.users,
        clubs: s.clubs,
        events: s.events,
        customBuildings: s.customBuildings,
        currentUserId: s.currentUserId,
        viewAs: s.viewAs,
        followingByUser: s.followingByUser,
        savedByUser: s.savedByUser,
        notifications: s.notifications,
        comments: s.comments,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-hydrate ad-hoc locations into the shared lookup so cards/maps resolve.
        if (state?.customBuildings) {
          for (const b of state.customBuildings) buildingById[b.id] = b
        }
      },
    },
  ),
)
