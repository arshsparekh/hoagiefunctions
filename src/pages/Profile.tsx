import { Link } from 'react-router-dom'
import { useStore } from '../store'
import type { CampusEvent, Club } from '../data/seed'
import Avatar from '../components/ui/Avatar'
import ClassYearBadge from '../components/ui/ClassYearBadge'
import ClubBadge from '../components/ui/ClubBadge'
import Fill from '../components/ui/Fill'
import EventCard from '../components/ui/EventCard'
import SectionHeader from '../components/ui/SectionHeader'
import EmptyState from '../components/ui/EmptyState'
import { canManageEvent } from '../lib/visibility'
import { CalendarIcon, TicketIcon, ClockIcon } from '../components/icons'

export default function Profile() {
  const store = useStore()
  const me = store.currentUser()

  const eventById = new Map(store.events.map((e) => [e.id, e]))
  const clubById = new Map(store.clubs.map((c) => [c.id, c]))
  const asEvents = (ids: string[]) =>
    ids.map((id) => eventById.get(id)).filter((e): e is CampusEvent => Boolean(e))

  const going = asEvents(me.rsvps)
  const guestlist = asEvents(
    me.applications.filter((a) => a.status === 'approved' || a.status === 'auto').map((a) => a.eventId),
  )
  const pendingEvents = asEvents(
    me.applications.filter((a) => a.status === 'pending').map((a) => a.eventId),
  )
  const pendingClubs = me.clubMemberships
    .filter((m) => m.status === 'pending')
    .map((m) => clubById.get(m.clubId))
    .filter((c): c is Club => Boolean(c))

  // Events this user hosts / can manage (edit + run the door).
  const managing = store
    .eventsSorted()
    .filter((e) => canManageEvent(e, me))

  // Clubs this user runs - shown up top next to the year as their role.
  const adminClubs = me.adminOf.map((id) => clubById.get(id)).filter((c): c is Club => Boolean(c))

  // Club badges: every membership, plus the eating club if it isn't already one.
  const badgeClubIds = new Set(me.clubMemberships.map((m) => m.clubId))
  if (me.eatingClubId) badgeClubIds.add(me.eatingClubId)
  const badgeClubs = [...badgeClubIds].map((id) => clubById.get(id)).filter((c): c is Club => Boolean(c))

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
      {/* Identity */}
      <div className="flex items-start gap-4">
        <Avatar user={me} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-brand text-[24px] font-extrabold leading-tight tracking-tight text-pink-900">
              {me.name}
            </h1>
            <ClassYearBadge classYear={me.classYear} />
            {adminClubs.map((c) => (
              <Link key={c.id} to={`/club/${c.id}`} className="transition-opacity hover:opacity-80">
                <Fill fill={c.colorFill}>{c.name} Admin</Fill>
              </Link>
            ))}
          </div>
          {badgeClubs.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                Your clubs
              </p>
              <div className="flex flex-wrap gap-1.5">
                {badgeClubs.map((c) => (
                  <Link key={c.id} to={`/club/${c.id}`} className="transition-opacity hover:opacity-80">
                    <ClubBadge club={c} user={me} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Managing (hosts / club admins) */}
      {managing.length > 0 && (
        <section className="mt-7">
          <SectionHeader
            title="Events you manage"
            subtitle="Edit details and run the door from any of these"
          />
          <div className="flex flex-col gap-3">
            {managing.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* Going */}
      <section className="mt-8">
        <SectionHeader title="Going" subtitle={going.length ? `${going.length} events` : undefined} />
        {going.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={26} />}
            title="Nothing on the calendar yet"
            message="RSVP to events and they'll show up here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {going.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* On the guestlist */}
      <section className="mt-8">
        <SectionHeader
          title="On the guestlist"
          subtitle={guestlist.length ? `${guestlist.length} events` : undefined}
        />
        {guestlist.length === 0 ? (
          <EmptyState
            icon={<TicketIcon size={26} />}
            title="No guestlist spots yet"
            message="Request to attend a guestlist event to claim your spot."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {guestlist.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* Pending */}
      <section className="mt-8">
        <SectionHeader title="Pending" />
        {pendingEvents.length === 0 && pendingClubs.length === 0 ? (
          <EmptyState
            icon={<ClockIcon size={26} />}
            title="Nothing pending"
            message="Requests waiting on an admin will appear here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pendingEvents.map((e) => (
              <EventCard key={e.id} event={e} compact />
            ))}
            {pendingClubs.map((c) => (
              <Link
                key={c.id}
                to={`/club/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-white p-3 shadow-hoagie transition-all duration-150 hover:border-pink-200"
              >
                <ClubBadge club={c} user={me} />
                <span className="text-[12px] text-muted">Membership pending</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
