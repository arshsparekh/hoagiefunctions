import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore, buildingById } from '../store'
import { useToasts } from '../lib/toast'
import type { User } from '../data/seed'
import { formatEventDateTime } from '../lib/datetime'
import AccessTypePill from '../components/ui/AccessTypePill'
import ClubBadge from '../components/ui/ClubBadge'
import TagChip from '../components/ui/TagChip'
import Avatar, { AvatarStack } from '../components/ui/Avatar'
import Fill from '../components/ui/Fill'
import Button from '../components/ui/Button'
import SectionHeader from '../components/ui/SectionHeader'
import EmptyState from '../components/ui/EmptyState'
import MiniMap from '../components/ui/MiniMap'
import EditEventModal from '../components/ui/EditEventModal'
import FollowButton from '../components/ui/FollowButton'
import SaveButton from '../components/ui/SaveButton'
import EventComments from '../components/ui/EventComments'
import { PageContainer } from '../components/PageContainer'
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  ArrowLeftIcon,
  MapPinIcon,
  LockIcon,
  ShareIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
  ClockIcon as PendingIcon,
} from '../components/icons'
import { audienceLabel, canSeeEvent, canManageEvent } from '../lib/visibility'
import { downloadIcs } from '../lib/ics'
import { toCsv, downloadCsv } from '../lib/csv'

const HOST_ICON = { individual: UserIcon, club: UsersIcon, eatingClub: UtensilsIcon } as const

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useStore()
  const push = useToasts((s) => s.push)
  const [editing, setEditing] = useState(false)
  const [doorQuery, setDoorQuery] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const event = store.events.find((e) => e.id === id)

  if (!event) {
    return (
      <PageContainer>
        <EmptyState
          icon={<CalendarIcon size={28} />}
          title="Event not found"
          message="This event may have been removed."
          action={
            <Button size="sm" onClick={() => navigate('/')}>
              Back to feed
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const me = store.currentUser()

  // Enforce audience on direct links too - not just discovery surfaces.
  if (!canSeeEvent(event, me)) {
    return (
      <PageContainer>
        <EmptyState
          icon={<LockIcon size={28} />}
          title="This event is private"
          message="It was posted to a specific audience you're not part of."
          action={
            <Button size="sm" onClick={() => navigate('/')}>
              Back to feed
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const building = buildingById[event.buildingId]
  const { dateLabel, timeLabel } = formatEventDateTime(event.start, event.end)

  const userById = new Map(store.users.map((u) => [u.id, u]))
  const attendees = event.attendeeIds
    .map((aid) => userById.get(aid))
    .filter((u): u is User => Boolean(u))

  // People the viewer follows who are going.
  const myFollowing = store.followingByUser[me.id] ?? []
  const followedGoing = attendees.filter((u) => u.id !== me.id && myFollowing.includes(u.id))

  const hostClub =
    event.hostType === 'club' || event.hostType === 'eatingClub'
      ? store.clubs.find((c) => c.id === event.hostId)
      : undefined
  const hostUser = event.hostType === 'individual' ? userById.get(event.hostId) : undefined
  const HostIcon = HOST_ICON[event.hostType]

  const isAttending = event.attendeeIds.includes(me.id)
  const myApplicant = event.applicants.find((a) => a.userId === me.id)
  const canManage = canManageEvent(event, me)

  const waitlist = event.waitlistIds ?? []
  const isWaitlisted = waitlist.includes(me.id)
  const waitlistPos = isWaitlisted ? waitlist.indexOf(me.id) + 1 : 0
  const isFull = event.capacity !== undefined && event.attendeeIds.length >= event.capacity

  // Door check-in roster (managers only).
  const checkedIn = new Set(event.checkedInIds ?? [])
  const doorList = attendees.filter((u) =>
    u.name.toLowerCase().includes(doorQuery.trim().toLowerCase()),
  )

  // --- Actions -------------------------------------------------------------

  const onToggleRsvp = () => {
    if (isAttending) {
      store.cancelRsvp(event.id)
      push(event.accessType === 'open' ? "You're no longer going" : 'RSVP canceled', 'neutral')
    } else if (isWaitlisted) {
      store.cancelRsvp(event.id)
      push('Left the waitlist', 'neutral')
    } else {
      const r = store.rsvp(event.id)
      if (r.ok) push("You're going", 'success')
      else if (r.waitlisted) push(r.reason ?? "You're on the waitlist", 'neutral')
      else push(r.reason ?? 'Could not RSVP', 'danger')
    }
  }

  const onShare = async () => {
    const url = `${window.location.origin}/event/${event.id}`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: event.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      push('Link copied', 'success')
    } catch {
      /* user dismissed the share sheet - not an error worth surfacing */
    }
  }

  const onAddToCalendar = () => {
    downloadIcs({
      id: event.id,
      title: event.title,
      description: event.description,
      location: building?.name,
      start: event.start,
      end: event.end,
      url: `${window.location.origin}/event/${event.id}`,
    })
    push('Added to your calendar', 'neutral')
  }

  const onDelete = () => {
    const r = store.deleteEvent(event.id)
    if (!r.ok) {
      push(r.reason ?? 'Could not cancel', 'danger')
      return
    }
    push('Event canceled', 'neutral')
    navigate('/')
  }

  const onExportRoster = () => {
    const rows = [
      ['Name', 'Class Year', 'Checked in'],
      ...attendees.map((u) => [u.name, `Class of ${u.classYear}`, checkedIn.has(u.id) ? 'Yes' : 'No']),
    ]
    downloadCsv(`${event.title} attendees`, toCsv(rows))
    push('Roster exported', 'neutral')
  }

  const onApply = () => {
    const r = store.applyToEvent(event.id)
    if (!r.ok) {
      push(r.reason, 'danger')
      return
    }
    if (r.status === 'auto') push("You're on the list", 'success')
    else push('Request sent', 'neutral')
  }

  const onWithdraw = () => {
    store.withdrawApplication(event.id)
    push('Request withdrawn', 'neutral')
  }

  // --- Primary action state ------------------------------------------------

  const guestState =
    myApplicant?.status === 'auto'
      ? 'auto'
      : myApplicant?.status === 'approved' || (isAttending && !myApplicant)
        ? 'approved'
        : myApplicant?.status === 'pending'
          ? 'pending'
          : 'none'

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-text"
        >
          <ArrowLeftIcon size={16} />
          Back
        </button>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit event
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-brand text-[24px] font-extrabold leading-tight tracking-tight text-pink-900 sm:text-[28px]">
          {event.title}
        </h1>
        <div className="shrink-0 pt-1">
          <AccessTypePill type={event.accessType} />
        </div>
      </div>

      {/* Host row */}
      <div className="mt-3 flex items-center gap-2 text-[14px]">
        <HostIcon size={16} className="shrink-0 text-muted" />
        {hostClub ? (
          <>
            <Link to={`/club/${hostClub.id}`} className="transition-opacity hover:opacity-80">
              <ClubBadge club={hostClub} user={me} />
            </Link>
            <FollowButton id={hostClub.id} name={hostClub.name} size={24} />
          </>
        ) : hostUser ? (
          <>
            <span className="flex items-center gap-1.5">
              <Avatar user={hostUser} size={22} />
              <span className="text-text">{event.hostName}</span>
            </span>
            {hostUser.id !== me.id && (
              <FollowButton id={hostUser.id} name={hostUser.name} size={24} />
            )}
          </>
        ) : (
          <span className="text-text">{event.hostName}</span>
        )}
      </div>

      {/* Date / time */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-text">
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon size={16} className="shrink-0 text-muted" />
          {dateLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon size={16} className="shrink-0 text-muted" />
          {timeLabel}
        </span>
      </div>

      {/* Audience (restricted posts) */}
      {audienceLabel(event, store.clubs) && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-[13px] font-medium text-text">
          <LockIcon size={15} className="shrink-0 text-muted" />
          {audienceLabel(event, store.clubs)}
        </p>
      )}

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.tags.map((t) => (
            <TagChip key={t} tagId={t} />
          ))}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <p className="mt-4 text-[14px] leading-relaxed text-text">{event.description}</p>
      )}

      {/* Map - only when we know where the location is; otherwise just its name */}
      {building && building.lat != null && building.lng != null ? (
        <div className="mt-5">
          <MiniMap lat={building.lat} lng={building.lng} name={building.name} />
        </div>
      ) : building ? (
        <div className="mt-5 flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2.5 text-[14px] text-text">
          <MapPinIcon size={16} className="shrink-0 text-pink-500" />
          {building.name}
        </div>
      ) : null}

      {/* Attendees */}
      <div className="mt-5 flex items-center gap-3">
        {attendees.length > 0 ? (
          <>
            <AvatarStack users={attendees} max={6} size={28} />
            <span className="text-[14px] text-text">
              <span className="font-semibold">{attendees.length}</span>
              {event.capacity ? ` / ${event.capacity}` : ''} going
            </span>
          </>
        ) : (
          <span className="text-[14px] text-muted">No one going yet - be the first.</span>
        )}
      </div>

      {/* Capacity bar */}
      {event.capacity !== undefined && (
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border-muted">
          <div
            className={`h-full rounded-full transition-all ${isFull ? 'bg-warning' : 'bg-pink-500'}`}
            style={{
              width: `${Math.min(100, Math.round((event.attendeeIds.length / event.capacity) * 100))}%`,
            }}
          />
        </div>
      )}

      {/* People you follow who are going */}
      {followedGoing.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <AvatarStack users={followedGoing} max={5} size={22} />
          <span className="text-[13px] font-medium text-pink-600">
            {followedGoing.length === 1
              ? `${followedGoing[0].name} is going`
              : `${followedGoing.length} people you follow are going`}
          </span>
        </div>
      )}

      {/* Secondary actions: save, share, add to calendar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SaveButton eventId={event.id} variant="labeled" />
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-semibold text-text transition-colors hover:bg-surface"
        >
          <ShareIcon size={16} />
          Share
        </button>
        <button
          type="button"
          onClick={onAddToCalendar}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-semibold text-text transition-colors hover:bg-surface"
        >
          <CalendarIcon size={16} />
          Add to calendar
        </button>
      </div>

      {/* Waitlist visibility for managers */}
      {canManage && waitlist.length > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <ClockIcon size={15} className="shrink-0" />
          {waitlist.length} waiting for a spot
        </p>
      )}

      {/* Reservation line */}
      {event.reservationConfirmed && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2E8B67]">
          <CheckIcon size={16} className="shrink-0" />
          Space reserved. This location is locked for this event.
        </p>
      )}

      {/* Primary action */}
      <div className="mt-6">
        {event.accessType === 'guestlist' ? (
          guestState === 'auto' || guestState === 'approved' ? (
            <div className="flex flex-col gap-3">
              <div className="hf-pop flex items-start gap-3 rounded-md border border-success/40 bg-success-bg p-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <CheckIcon size={18} />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-[#2E8B67]">You&rsquo;re on the list.</p>
                  {guestState === 'auto' && hostClub && (
                    <p className="mt-0.5 text-[13px] text-[#2E8B67]">
                      Auto-accepted with your {hostClub.name} badge.
                    </p>
                  )}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={onWithdraw}>
                Withdraw
              </Button>
            </div>
          ) : guestState === 'pending' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface p-4 text-muted">
                <PendingIcon size={18} className="shrink-0" />
                <p className="text-[14px]">Request sent. Waiting on an admin.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={onWithdraw}>
                Withdraw request
              </Button>
            </div>
          ) : (
            <Button onClick={onApply}>Request to attend</Button>
          )
        ) : isAttending ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-success-bg px-3 py-2 text-[14px] font-semibold text-[#2E8B67]">
              <CheckIcon size={16} />
              You&rsquo;re going
            </span>
            <Button variant="secondary" size="sm" onClick={onToggleRsvp}>
              {event.accessType === 'open' ? "Can't make it" : 'Cancel RSVP'}
            </Button>
          </div>
        ) : isWaitlisted ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-2 text-[14px] font-semibold text-text">
              <ClockIcon size={16} className="text-muted" />
              On the waitlist · #{waitlistPos}
            </span>
            <Button variant="secondary" size="sm" onClick={onToggleRsvp}>
              Leave waitlist
            </Button>
          </div>
        ) : isFull ? (
          <div className="flex flex-col gap-2">
            <Button onClick={onToggleRsvp}>Join waitlist</Button>
            <span className="text-[13px] text-muted">
              This event is at capacity - we&rsquo;ll move you up if a spot opens.
            </span>
          </div>
        ) : (
          <Button onClick={onToggleRsvp}>{event.accessType === 'open' ? "I'm going" : 'RSVP'}</Button>
        )}
      </div>

      {/* Door check-in (host/admin): search the roster and tap people in at the door */}
      {canManage && (
        <section className="mt-8">
          <SectionHeader
            title="Door check-in"
            subtitle={`${checkedIn.size} / ${attendees.length} checked in`}
            action={
              attendees.length > 0 ? (
                <button
                  type="button"
                  onClick={onExportRoster}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[13px] font-medium text-text transition-colors hover:bg-surface"
                >
                  Export CSV
                </button>
              ) : undefined
            }
          />
          {attendees.length === 0 ? (
            <div className="rounded-md border border-border bg-surface px-4 py-6 text-center text-[13px] text-muted">
              No one is going yet.
            </div>
          ) : (
            <>
              <input
                value={doorQuery}
                onChange={(e) => setDoorQuery(e.target.value)}
                placeholder="Search attendees by name…"
                className="mb-2 h-10 w-full rounded-md border border-border bg-white px-3 text-[14px] text-text placeholder:text-muted focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              <ul className="flex flex-col gap-2">
                {doorList.map((u) => {
                  const inHere = checkedIn.has(u.id)
                  return (
                    <li
                      key={u.id}
                      className={`flex items-center gap-3 rounded-md border p-3 shadow-hoagie ${
                        inHere ? 'border-success bg-success-bg' : 'border-border bg-white'
                      }`}
                    >
                      <Avatar user={u} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-text">{u.name}</p>
                        <p className="text-[12px] text-muted">Class of {u.classYear}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => store.toggleCheckIn(event.id, u.id)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                          inHere
                            ? 'border-success bg-white text-[#2E8B67]'
                            : 'border-border bg-white text-text hover:bg-surface'
                        }`}
                      >
                        {inHere ? (
                          <>
                            <CheckIcon size={15} />
                            Checked in
                          </>
                        ) : (
                          'Check in'
                        )}
                      </button>
                    </li>
                  )
                })}
                {doorList.length === 0 && (
                  <li className="rounded-md border border-border bg-surface px-4 py-4 text-center text-[13px] text-muted">
                    No attendees match &ldquo;{doorQuery}&rdquo;.
                  </li>
                )}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Manage guestlist (the event's host / club admin) */}
      {canManage && event.accessType === 'guestlist' && (
        <section className="mt-8">
          <SectionHeader
            title="Manage guestlist"
            subtitle={`${event.applicants.filter((a) => a.status === 'pending').length} pending`}
          />
          {event.applicants.length === 0 ? (
            <div className="rounded-md border border-border bg-surface px-4 py-6 text-center text-[13px] text-muted">
              No requests yet.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {event.applicants.map((a) => {
                const u = userById.get(a.userId)
                if (!u) return null
                return (
                  <li
                    key={a.userId}
                    className="flex items-center gap-3 rounded-md border border-border bg-white p-3 shadow-hoagie"
                  >
                    <Avatar user={u} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-text">{u.name}</p>
                    </div>
                    {a.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const r = store.approveApplicant(event.id, u.id)
                            push(r.ok ? `Approved ${u.name}` : (r.reason ?? 'Not allowed'), r.ok ? 'success' : 'danger')
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const r = store.denyApplicant(event.id, u.id)
                            push(r.ok ? `Removed ${u.name}` : (r.reason ?? 'Not allowed'), 'neutral')
                          }}
                        >
                          Deny
                        </Button>
                      </div>
                    ) : (
                      <Fill fill="green">
                        {a.status === 'auto' ? 'Auto-accepted' : 'Approved'}
                      </Fill>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Discussion */}
      <EventComments eventId={event.id} />

      {/* Cancel event (host / club admin) */}
      {canManage && (
        <section className="mt-8 border-t border-border pt-6">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-[13px] font-medium text-danger transition-opacity hover:opacity-80"
            >
              Cancel this event
            </button>
          ) : (
            <div className="rounded-md border border-danger/40 bg-danger-bg p-4">
              <p className="text-[14px] font-semibold text-danger">Cancel this event?</p>
              <p className="mt-1 text-[13px] text-danger">
                This removes it for everyone and notifies attendees. It can&rsquo;t be undone.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-md bg-danger px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Yes, cancel it
                </button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Keep event
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {editing && <EditEventModal event={event} onClose={() => setEditing(false)} />}
    </div>
  )
}
