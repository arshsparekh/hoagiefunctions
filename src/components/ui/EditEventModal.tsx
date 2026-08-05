import { useEffect, useRef, useState } from 'react'
import { useStore, tags } from '../../store'
import { useToasts } from '../../lib/toast'
import type { AccessType, CampusEvent } from '../../data/seed'
import AccessTypePill from './AccessTypePill'
import TagChip from './TagChip'
import Button from './Button'
import { XIcon } from '../icons'

const ACCESS_TYPES: AccessType[] = ['open', 'rsvp', 'guestlist']
const inputCls =
  'h-11 w-full rounded-md border border-border bg-white px-3 text-[14px] text-text placeholder:text-muted transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300'
const labelCls = 'mb-1.5 block text-[13px] font-medium text-text'
const pad = (n: number) => String(n).padStart(2, '0')

/** Host/admin edit of an event's details. */
export default function EditEventModal({ event, onClose }: { event: CampusEvent; onClose: () => void }) {
  const updateEvent = useStore((s) => s.updateEvent)
  const push = useToasts((s) => s.push)

  const s = new Date(event.start)
  const e = new Date(event.end)
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description)
  const [date, setDate] = useState(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`)
  const [startTime, setStartTime] = useState(`${pad(s.getHours())}:${pad(s.getMinutes())}`)
  const [endTime, setEndTime] = useState(`${pad(e.getHours())}:${pad(e.getMinutes())}`)
  const [accessType, setAccessType] = useState<AccessType>(event.accessType)
  const [capacity, setCapacity] = useState(event.capacity ? String(event.capacity) : '')
  const [selectedTags, setSelectedTags] = useState<string[]>(event.tags)
  const [hasReservation, setHasReservation] = useState(event.reservationConfirmed)

  const dialogRef = useRef<HTMLFormElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Accessible dialog behavior: focus the first field on open, keep Tab focus
  // inside the dialog, close on Escape, and restore focus to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    titleInputRef.current?.focus()

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onClose()
        return
      }
      if (ev.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault()
        last.focus()
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  const toggleTag = (id: string) =>
    setSelectedTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))

  const onSave = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!title.trim()) return
    const start = new Date(`${date}T${startTime}`)
    let end = new Date(`${date}T${endTime}`)
    if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86_400_000)
    const r = updateEvent(event.id, {
      title: title.trim(),
      description: description.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      accessType,
      tags: selectedTags,
      reservationConfirmed: hasReservation,
      capacity: capacity.trim() ? Number(capacity) : undefined,
    })
    if (!r.ok) {
      push(r.reason ?? 'Could not save changes', 'danger')
      return
    }
    push('Event updated', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <form
        ref={dialogRef}
        onSubmit={onSave}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-event-title"
        className="hf-sheet-up relative z-10 mt-auto max-h-[88vh] w-full overflow-y-auto rounded-t-md bg-white p-4 shadow-hoagie sm:mt-0 sm:w-[480px] sm:max-w-[calc(100vw-2rem)] sm:rounded-md sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="edit-event-title" className="font-brand text-[18px] font-bold text-pink-900">
            Edit event
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <XIcon size={18} />
          </button>
        </div>

        <label className={labelCls} htmlFor="edit-event-title-input">
          Title
        </label>
        <input
          id="edit-event-title-input"
          ref={titleInputRef}
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className={`${labelCls} mt-4`}>Description</label>
        <textarea
          className={`${inputCls} h-auto min-h-[72px] resize-y py-2.5`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Starts</label>
            <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Ends</label>
            <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <label className={`${labelCls} mt-4`}>Who can come?</label>
        <div className="grid grid-cols-3 gap-2">
          {ACCESS_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAccessType(t)}
              className={`flex items-center justify-center rounded-md border px-2 py-2.5 transition-colors ${
                accessType === t
                  ? 'border-pink-400 bg-pink-25 ring-2 ring-pink-300'
                  : 'border-border bg-white hover:bg-surface'
              }`}
            >
              <AccessTypePill type={t} />
            </button>
          ))}
        </div>

        <label className={`${labelCls} mt-4`}>Capacity (optional)</label>
        <input
          type="number"
          min={1}
          className={inputCls}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="No limit"
        />

        <span className={`${labelCls} mt-4`}>Tags</span>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <TagChip
              key={t.id}
              tagId={t.id}
              active={selectedTags.includes(t.id)}
              onClick={() => toggleTag(t.id)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setHasReservation((v) => !v)}
          aria-pressed={hasReservation}
          className="mt-4 flex w-full items-center gap-3 text-left"
        >
          <span
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              hasReservation ? 'bg-pink-500' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                hasReservation ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className="text-[14px] font-medium text-text">Space reserved for this event</span>
        </button>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit">Save changes</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
