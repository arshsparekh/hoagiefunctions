import { Link } from 'react-router-dom'
import { useStore, buildingById } from '../../store'
import type { CampusEvent, User } from '../../data/seed'
import { formatEventDateTime } from '../../lib/datetime'
import { audienceLabel } from '../../lib/visibility'
import AccessTypePill from './AccessTypePill'
import ClubBadge from './ClubBadge'
import TagChip from './TagChip'
import Avatar, { AvatarStack } from './Avatar'
import SaveButton from './SaveButton'
import { CalendarIcon, ClockIcon, MapPinIcon, CheckIcon, LockIcon } from '../icons'

/**
 * The workhorse feed card. Reads live users/clubs + the current user from the
 * store; static building/tag labels come from the seed lookups. Clicking routes
 * to the event detail page. Pass `compact` for the mini card used in calendar
 * day panels and map popups.
 */
export default function EventCard({
  event,
  compact = false,
}: {
  event: CampusEvent
  compact?: boolean
}) {
  const users = useStore((s) => s.users)
  const clubs = useStore((s) => s.clubs)
  const currentUser = useStore((s) => s.currentUser())

  const userById = new Map(users.map((u) => [u.id, u]))
  const building = buildingById[event.buildingId]
  const { dateLabel, timeLabel } = formatEventDateTime(event.start, event.end)

  const attendees = event.attendeeIds
    .map((id) => userById.get(id))
    .filter((u): u is User => Boolean(u))

  const hostClub =
    event.hostType === 'club' || event.hostType === 'eatingClub'
      ? clubs.find((c) => c.id === event.hostId)
      : undefined
  const hostUser = event.hostType === 'individual' ? userById.get(event.hostId) : undefined
  const restricted = audienceLabel(event, clubs)
  const attending = event.attendeeIds.includes(currentUser.id)

  // Green highlight around events the current user is attending.
  const shell = `group block rounded-md border shadow-hoagie transition-all duration-150 ${
    attending
      ? 'border-success bg-success-bg hover:border-success'
      : 'border-border bg-white hover:border-pink-200'
  }`
  const goingBadge = attending ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-success-bg px-1.5 py-0.5 text-[11px] font-semibold text-[#2E8B67]">
      <CheckIcon size={12} />
      Going
    </span>
  ) : null

  if (compact) {
    return (
      <Link to={`/event/${event.id}`} className={`${shell} p-3`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14px] font-semibold leading-snug text-pink-900 group-hover:text-pink-700">
            {event.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {goingBadge}
            <AccessTypePill type={event.accessType} />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1">
            <ClockIcon size={13} className="shrink-0" />
            {timeLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPinIcon size={13} className="shrink-0" />
            {building?.name ?? 'Location TBD'}
          </span>
        </div>
        {restricted && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-muted">
            <LockIcon size={12} className="shrink-0" />
            {restricted}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          {hostClub ? (
            <ClubBadge club={hostClub} user={currentUser} />
          ) : hostUser ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-muted">
              <Avatar user={hostUser} size={16} />
              {event.hostName}
            </span>
          ) : null}
          {attendees.length > 0 && (
            <span className="ml-auto text-[12px] text-muted">
              {attendees.length}
              {event.capacity ? ` / ${event.capacity}` : ''} going
            </span>
          )}
        </div>
      </Link>
    )
  }

  const shownTags = event.tags.slice(0, 3)
  const extraTags = event.tags.length - shownTags.length

  return (
    <Link to={`/event/${event.id}`} className={`${shell} p-4 hover:-translate-y-0.5`}>
      <div className="flex flex-col gap-2">
        {/* Title + access */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold leading-snug text-pink-900 group-hover:text-pink-700">
            {event.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            {goingBadge}
            <AccessTypePill type={event.accessType} />
            <SaveButton eventId={event.id} size={17} />
          </div>
        </div>

        {/* Host + restricted */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {hostClub ? (
            <ClubBadge club={hostClub} user={currentUser} />
          ) : hostUser ? (
            <span className="flex items-center gap-1.5">
              <Avatar user={hostUser} size={18} />
              <span className="text-text">{event.hostName}</span>
            </span>
          ) : (
            <span className="text-text">{event.hostName}</span>
          )}
          {restricted && (
            <span className="inline-flex items-center gap-1 text-[12px] text-muted">
              <LockIcon size={12} className="shrink-0" />
              {restricted}
            </span>
          )}
        </div>

        {/* When + where (one line) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon size={14} className="shrink-0" />
            {dateLabel}, {timeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon size={14} className="shrink-0" />
            {building?.name ?? 'Location TBD'}
          </span>
        </div>

        {/* Footer: tags + social proof, on one baseline */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {shownTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {shownTags.map((t) => (
                <TagChip key={t} tagId={t} />
              ))}
              {extraTags > 0 && <span className="text-[12px] text-muted">+{extraTags}</span>}
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            {event.reservationConfirmed && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-pink-600">
                <CheckIcon size={14} />
                Reserved
              </span>
            )}
            {attendees.length > 0 && (
              <div className="flex items-center gap-1.5">
                <AvatarStack users={attendees} max={3} size={22} />
                <span className="text-[12px] text-muted">
                  {attendees.length}
                  {event.capacity ? `/${event.capacity}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
