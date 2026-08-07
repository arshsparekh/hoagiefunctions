import { useMemo, useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, buildingById, tagById } from '../store'
import type { CampusEvent, Club, User } from '../data/seed'
import EventCard from '../components/ui/EventCard'
import Fill from '../components/ui/Fill'
import Avatar from '../components/ui/Avatar'
import ClassYearBadge from '../components/ui/ClassYearBadge'
import FollowButton from '../components/ui/FollowButton'
import EmptyState from '../components/ui/EmptyState'
import { SearchIcon, XIcon } from '../components/icons'

/** Free-text search across events, clubs, and people. */
export default function Search() {
  const store = useStore()
  const me = store.currentUser()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const query = q.trim().toLowerCase()

  const { events, clubs, people } = useMemo(() => {
    if (query.length < 2) return { events: [], clubs: [], people: [] }

    const eventText = (e: CampusEvent) =>
      [
        e.title,
        e.description,
        e.hostName,
        buildingById[e.buildingId]?.name ?? '',
        ...e.tags.map((t) => tagById[t]?.label ?? ''),
      ]
        .join(' ')
        .toLowerCase()

    const events = store.visibleEvents().filter((e) => eventText(e).includes(query))
    const clubs = store.clubs.filter(
      (c: Club) =>
        c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
    )
    const people = store.users.filter(
      (u: User) => u.id !== 'u-guest' && u.name.toLowerCase().includes(query),
    )
    return { events, clubs, people }
  }, [query, store])

  const total = events.length + clubs.length + people.length

  const clubItem = (c: Club) => (
    <li key={c.id}>
      <Link
        to={`/club/${c.id}`}
        className="flex items-center gap-3 rounded-md border border-border bg-white p-3 shadow-hoagie transition-colors hover:border-pink-300"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-text">{c.name}</p>
          <p className="truncate text-[12px] text-muted">{c.description}</p>
        </div>
        <Fill fill={c.colorFill}>{c.kind === 'eatingClub' ? 'Eating Club' : 'Club'}</Fill>
      </Link>
    </li>
  )

  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
      <div className="relative mb-5">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events, clubs, and people…"
          className="h-12 w-full rounded-md border border-border bg-white pl-10 pr-10 text-[15px] text-text placeholder:text-muted focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ('')}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <XIcon size={16} />
          </button>
        )}
      </div>

      {query.length < 2 ? (
        <section>
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            Browse clubs · {store.clubs.length}
          </h2>
          <ul className="flex flex-col gap-2">{store.clubs.map(clubItem)}</ul>
          <p className="mt-4 text-[13px] text-muted">
            Search by name to find events and people too.
          </p>
        </section>
      ) : total === 0 ? (
        <EmptyState
          icon={<SearchIcon size={26} />}
          title="No matches"
          message={`Nothing on The Wire matched "${q.trim()}".`}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {people.length > 0 && (
            <section>
              <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                People · {people.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {people.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-white p-3 shadow-hoagie"
                  >
                    <Avatar user={u} size={34} />
                    <span className="flex-1 truncate text-[14px] font-medium text-text">
                      {u.name}
                    </span>
                    <ClassYearBadge classYear={u.classYear} />
                    {u.id !== me.id && <FollowButton id={u.id} name={u.name} size={26} />}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {clubs.length > 0 && (
            <section>
              <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                Clubs · {clubs.length}
              </h2>
              <ul className="flex flex-col gap-2">{clubs.map(clubItem)}</ul>
            </section>
          )}

          {events.length > 0 && (
            <section>
              <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                Events · {events.length}
              </h2>
              <div className="flex flex-col gap-3">
                {events.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
