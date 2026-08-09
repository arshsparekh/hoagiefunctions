import { useMemo, useRef, useState } from 'react'
import { useStore, tags, buildingById } from '../../store'
import { useDialog } from '../../lib/useDialog'
import { useToasts } from '../../lib/toast'
import type { AccessType, CampusEvent, EventAudience } from '../../data/seed'
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
  const users = useStore((s) => s.users)
  const clubs = useStore((s) => s.clubs)
  const push = useToasts((s) => s.push)

  const hostClub =
    event.hostType !== 'individual' ? clubs.find((c) => c.id === event.hostId) : undefined
  const userById = new Map(users.map((u) => [u.id, u]))
  const initialAudience = event.audience ?? { kind: 'everyone' as const }

  const s = new Date(event.start)
  const e = new Date(event.end)
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description)
  const [date, setDate] = useState(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`)
  const [startTime, setStartTime] = useState(`${pad(s.getHours())}:${pad(s.getMinutes())}`)
  const [endTime, setEndTime] = useState(`${pad(e.getHours())}:${pad(e.getMinutes())}`)
  const [buildingId, setBuildingId] = useState(event.buildingId)
  const [accessType, setAccessType] = useState<AccessType>(event.accessType)
  const [capacity, setCapacity] = useState(event.capacity ? String(event.capacity) : '')

  // Known locations to pick from (static campus buildings + any ad-hoc ones),
  // always including the event's current building so it stays selectable.
  const locationOptions = useMemo(() => {
    const all = Object.values(buildingById)
    if (!all.some((b) => b.id === event.buildingId) && buildingById[event.buildingId]) {
      all.push(buildingById[event.buildingId])
    }
    return [...all].sort((a, b) => a.name.localeCompare(b.name))
  }, [event.buildingId])
  const [selectedTags, setSelectedTags] = useState<string[]>(event.tags)
  const [hasReservation, setHasReservation] = useState(event.reservationConfirmed)
  const [audienceKind, setAudienceKind] = useState<'everyone' | 'club' | 'people'>(
    initialAudience.kind,
  )
  const [invitees, setInvitees] = useState<string[]>(
    initialAudience.kind === 'people' ? initialAudience.userIds : [],
  )

  const dialogRef = useRef<HTMLFormElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus the title field on open; trap Tab; Escape closes; restore focus on close.
  useDialog(dialogRef, onClose, titleInputRef)

  const toggleTag = (id: string) =>
    setSelectedTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))

  const onSave = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!title.trim()) return
    const start = new Date(`${date}T${startTime}`)
    let end = new Date(`${date}T${endTime}`)
    if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86_400_000)

    let audience: EventAudience
    if (audienceKind === 'club' && hostClub) audience = { kind: 'club', clubId: hostClub.id }
    else if (audienceKind === 'people') {
      if (invitees.length === 0) {
        push('Add at least one person, or choose Everyone.', 'danger')
        return
      }
      audience = { kind: 'people', userIds: invitees }
    } else audience = { kind: 'everyone' }

    const r = updateEvent(event.id, {
      title: title.trim(),
      description: description.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      buildingId,
      accessType,
      audience,
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

        <label className={`${labelCls} mt-4`} htmlFor="edit-location">
          Location
        </label>
        <select
          id="edit-location"
          className={inputCls}
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
        >
          {locationOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

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

        <span className={`${labelCls} mt-4`}>Who can see this?</span>
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-surface has-[:checked]:bg-pink-50">
            <input
              type="radio"
              name="edit-audience"
              className="accent-pink-500"
              checked={audienceKind === 'everyone'}
              onChange={() => setAudienceKind('everyone')}
            />
            <span className="text-[14px] text-text">Everyone</span>
          </label>
          {hostClub && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-surface has-[:checked]:bg-pink-50">
              <input
                type="radio"
                name="edit-audience"
                className="accent-pink-500"
                checked={audienceKind === 'club'}
                onChange={() => setAudienceKind('club')}
              />
              <span className="text-[14px] text-text">{hostClub.name} members only</span>
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-surface has-[:checked]:bg-pink-50">
            <input
              type="radio"
              name="edit-audience"
              className="accent-pink-500"
              checked={audienceKind === 'people'}
              onChange={() => setAudienceKind('people')}
            />
            <span className="text-[14px] text-text">Specific people</span>
          </label>
        </div>
        {audienceKind === 'people' && (
          <div className="mt-2">
            {invitees.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {invitees.map((uid) => {
                  const u = userById.get(uid)
                  if (!u) return null
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-pink-50 py-1 pl-2 pr-1.5 text-[13px] font-medium text-pink-700"
                    >
                      {u.name}
                      <button
                        type="button"
                        aria-label={`Remove ${u.name}`}
                        onClick={() => setInvitees((list) => list.filter((x) => x !== uid))}
                        className="text-pink-400 transition-colors hover:text-pink-700"
                      >
                        <XIcon size={13} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <select
              className={inputCls}
              value=""
              onChange={(e) => {
                const id = e.target.value
                if (id) setInvitees((list) => (list.includes(id) ? list : [...list, id]))
              }}
            >
              <option value="">Add a person…</option>
              {users
                .filter((u) => u.id !== 'u-guest' && !invitees.includes(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
        )}

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
