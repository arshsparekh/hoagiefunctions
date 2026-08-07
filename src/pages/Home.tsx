import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { CampusEvent } from '../data/seed'
import EventCard from '../components/ui/EventCard'
import SectionHeader from '../components/ui/SectionHeader'
import EmptyState from '../components/ui/EmptyState'
import TypeFilter from '../components/ui/TypeFilter'
import Button from '../components/ui/Button'
import { SkeletonEventCard } from '../components/ui/Skeleton'
import { CalendarIcon } from '../components/icons'

// Show the skeleton only on the very first paint of the session.
let firstPaint = true

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** "Today" / "Tomorrow" / "Wed, Aug 6" for a day. */
function dayLabel(d: Date, now: Date) {
  const k = dayKey(d)
  if (k === dayKey(now)) return 'Today'
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (k === dayKey(tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Short pill label for the date strip: "Today" or "Sun 3". */
function pillLabel(d: Date, now: Date) {
  if (dayKey(d) === dayKey(now)) return 'Today'
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`
}

function Feed({ title, subtitle, events }: { title: string; subtitle?: string; events: CampusEvent[] }) {
  if (events.length === 0) return null
  return (
    <section className="mt-7 first:mt-5">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col gap-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const store = useStore()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [day, setDay] = useState<string | null>(null) // dayKey or null = all dates
  const [loading, setLoading] = useState(firstPaint)
  const now = new Date()

  useEffect(() => {
    if (!firstPaint) return
    const t = setTimeout(() => {
      firstPaint = false
      setLoading(false)
    }, 450)
    return () => clearTimeout(t)
  }, [])

  // Forward-looking feed: drop events that have already ended (same rule as the map).
  const nowMs = now.getTime()
  const isLive = (e: CampusEvent) => new Date(e.end).getTime() >= nowMs
  const visible = store.visibleEvents().filter(isLive)

  // The days that actually have events -> the date strip.
  const days = [...new Set(visible.map((e) => dayKey(new Date(e.start))))]
    .map((k) => {
      const [y, m, d] = k.split('-').map(Number)
      return { key: k, date: new Date(y, m, d) }
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const passesTags = (e: CampusEvent) =>
    selectedTags.length === 0 || e.tags.some((t) => selectedTags.includes(t))
  const passesDay = (e: CampusEvent) => day === null || dayKey(new Date(e.start)) === day
  const passes = (e: CampusEvent) => passesTags(e) && passesDay(e)

  // Recommended strip only in the default "all dates" view.
  const recommended =
    day === null ? store.recommendedEvents().filter(isLive).filter(passes).slice(0, 3) : []
  const recommendedIds = new Set(recommended.map((e) => e.id))
  const rest = visible
    .filter((e) => !recommendedIds.has(e.id) && passes(e))
    .sort((a, b) => (a.start < b.start ? -1 : 1))

  // Group the rest by day for an agenda-style feed.
  const groups: { key: string; label: string; events: CampusEvent[] }[] = []
  for (const e of rest) {
    const k = dayKey(new Date(e.start))
    const g = groups.find((x) => x.key === k)
    if (g) g.events.push(e)
    else groups.push({ key: k, label: dayLabel(new Date(e.start), now), events: [e] })
  }

  const nothing = recommended.length === 0 && rest.length === 0

  const datePill = (key: string, label: string, active: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-pink-500 text-white'
          : 'border border-border bg-white text-text hover:border-pink-300'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6">
      <h1 className="font-brand text-[24px] font-extrabold leading-[1.15] tracking-tight text-pink-900 sm:text-[28px]">
        Every function on campus, in one place.
      </h1>

      {/* One filter row: Type dropdown + scrollable date strip */}
      <div className="sticky top-14 z-20 -mx-4 mt-4 border-b border-border-muted bg-canvas/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <TypeFilter selected={selectedTags} onChange={setSelectedTags} />

          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            {datePill('all', 'All dates', day === null, () => setDay(null))}
            {days.map((d) => datePill(d.key, pillLabel(d.date, now), day === d.key, () => setDay(d.key)))}
          </div>
        </div>
      </div>

      {loading ? (
        <section className="mt-5">
          <div className="mb-3 h-5 w-40 animate-pulse rounded-sm bg-border-muted" />
          <div className="flex flex-col gap-3">
            <SkeletonEventCard />
            <SkeletonEventCard />
            <SkeletonEventCard />
          </div>
        </section>
      ) : nothing ? (
        <div className="mt-6">
          <EmptyState
            icon={<CalendarIcon size={28} />}
            title="No events match these filters"
            message="Try another date or clearing the type filter."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedTags([])
                  setDay(null)
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <Feed
            title="Recommended for you"
            subtitle="From your clubs, RSVPs, and people you follow"
            events={recommended}
          />
          {groups.map((g) => (
            <Feed key={g.key} title={g.label} events={g.events} />
          ))}
        </>
      )}
    </div>
  )
}
