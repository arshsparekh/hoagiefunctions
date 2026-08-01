import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import type { CampusEvent } from '../data/seed'
import EventCard from '../components/ui/EventCard'
import Button from '../components/ui/Button'
import TypeFilter from '../components/ui/TypeFilter'
import { ChevronLeftIcon, ChevronRightIcon, XIcon, CalendarIcon } from '../components/icons'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b)

/** Panel of a single day's events - bottom sheet on mobile, centered modal on desktop. */
function DayPanel({
  date,
  events,
  onClose,
}: {
  date: Date
  events: CampusEvent[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="hf-sheet-up relative z-10 mt-auto max-h-[80vh] w-full overflow-y-auto rounded-t-md bg-white p-4 shadow-hoagie sm:mt-0 sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:rounded-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-brand text-[18px] font-bold text-pink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <XIcon size={18} />
          </button>
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-surface/60 px-4 py-10 text-center">
            <CalendarIcon size={24} className="text-muted" />
            <p className="text-[13px] text-muted">Nothing scheduled this day.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <EventCard key={e.id} event={e} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Calendar() {
  const store = useStore()
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selected, setSelected] = useState<Date | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const today = new Date()

  // Group the user's visible events (matching the type filter) by local day.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CampusEvent[]>()
    for (const e of store.visibleEvents()) {
      if (selectedTags.length > 0 && !e.tags.some((t) => selectedTags.includes(t))) continue
      const k = dayKey(new Date(e.start))
      const list = map.get(k)
      if (list) list.push(e)
      else map.set(k, [e])
    }
    for (const list of map.values()) list.sort((a, b) => (a.start < b.start ? -1 : 1))
    return map
  }, [store, selectedTags])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const leadingBlanks = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Cells: leading blanks (null) + each day of the month.
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelected(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-5 sm:px-6">
      {/* Month header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="font-brand text-[22px] font-bold text-pink-900">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={goToday}>
            Today
          </Button>
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>

      {/* Type filter - same control as the homepage */}
      <div className="mb-4">
        <TypeFilter selected={selectedTags} onChange={setSelectedTags} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border-muted">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-surface py-2 text-center font-mono text-[11px] uppercase tracking-wider text-muted"
          >
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} className="min-h-[92px] bg-white sm:min-h-[112px]" />
          const dayEvents = eventsByDay.get(dayKey(date)) ?? []
          const isToday = sameDay(date, today)
          const shown = dayEvents.slice(0, 3)
          const extra = dayEvents.length - shown.length

          return (
            <button
              key={dayKey(date)}
              onClick={() => setSelected(date)}
              className={`flex min-h-[92px] flex-col gap-1 p-1.5 text-left align-top transition-colors sm:min-h-[112px] ${
                isToday ? 'bg-pink-25 hover:bg-pink-50' : 'bg-white hover:bg-surface'
              }`}
            >
              <span
                className={`mb-0.5 inline-flex h-6 w-6 items-center justify-center text-[13px] font-medium ${
                  isToday
                    ? 'rounded-full bg-pink-500 font-semibold text-white'
                    : 'text-text'
                }`}
              >
                {date.getDate()}
              </span>
              {shown.map((e) => (
                <span
                  key={e.id}
                  className="w-full truncate rounded-sm bg-pink-50 px-1.5 py-0.5 text-[11px] font-medium text-pink-700"
                >
                  {e.title}
                </span>
              ))}
              {extra > 0 && (
                <span className="px-1 text-[11px] font-medium text-muted">+{extra} more</span>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <DayPanel
          date={selected}
          events={eventsByDay.get(dayKey(selected)) ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
