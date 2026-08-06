import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, buildings, tags } from '../store'
import { useToasts } from '../lib/toast'
import type { AccessType, Building, EventAudience } from '../data/seed'
import AccessTypePill from '../components/ui/AccessTypePill'
import TagChip from '../components/ui/TagChip'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import LocationPicker, { type LatLng } from '../components/ui/LocationPicker'
import { CheckIcon, MapPinIcon, PlusIcon, XIcon } from '../components/icons'

const ACCESS_TYPES: AccessType[] = ['open', 'rsvp', 'guestlist']
type AudienceKind = 'everyone' | 'club' | 'people'

const inputCls =
  'h-11 w-full rounded-md border border-border bg-white px-3 text-[14px] text-text placeholder:text-muted transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300'
const labelCls = 'mb-1.5 block text-[13px] font-medium text-text'
// Sections are light groups inside one card, separated by subtle dividers.
const sectionCls = 'py-5'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function Create() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const store = useStore()
  const push = useToasts((s) => s.push)
  const me = store.currentUser()

  // Clubs this user can post for (admin only) - enforces "clubs post through admins".
  const adminClubs = useMemo(
    () => store.clubs.filter((c) => me.adminOf.includes(c.id)),
    [store.clubs, me.adminOf],
  )

  const now = new Date()
  // Default to a sensible near-future slot (next hour, 2h long) so the prefilled
  // form is always valid - a fixed "19:00 today" would be in the past by evening.
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000)
  defaultStart.setMinutes(0, 0, 0)
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hostValue, setHostValue] = useState(() => {
    const preset = params.get('host')
    return preset && adminClubs.some((c) => c.id === preset) ? preset : 'me'
  })
  const [date, setDate] = useState(
    `${defaultStart.getFullYear()}-${pad(defaultStart.getMonth() + 1)}-${pad(defaultStart.getDate())}`,
  )
  const [startTime, setStartTime] = useState(`${pad(defaultStart.getHours())}:00`)
  const [endTime, setEndTime] = useState(`${pad(defaultEnd.getHours())}:00`)

  // Location autocomplete
  const [locQuery, setLocQuery] = useState('')
  const [buildingId, setBuildingId] = useState<string | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [customLatLng, setCustomLatLng] = useState<LatLng | null>(null)
  const [showSuggest, setShowSuggest] = useState(false)
  const locRef = useRef<HTMLDivElement>(null)

  const [accessType, setAccessType] = useState<AccessType>('open')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [hasReservation, setHasReservation] = useState(false)

  // Audience - who can SEE the post (separate from accessType).
  const [audienceKind, setAudienceKind] = useState<AudienceKind>('everyone')
  const [invitees, setInvitees] = useState<string[]>([])
  const [inviteQuery, setInviteQuery] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const inviteRef = useRef<HTMLDivElement>(null)

  const [showErrors, setShowErrors] = useState(false)
  const [conflictError, setConflictError] = useState<string | null>(null)

  // The club being posted as (if any) - the target for a "members only" audience.
  const hostClub = hostValue === 'me' ? undefined : store.clubs.find((c) => c.id === hostValue)

  // Posting as yourself can't target "club members" - fall back to everyone.
  useEffect(() => {
    if (!hostClub && audienceKind === 'club') setAudienceKind('everyone')
  }, [hostClub, audienceKind])

  useEffect(() => {
    if (!showSuggest) return
    const onDown = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) setShowSuggest(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showSuggest])

  const suggestions = useMemo(() => {
    const q = locQuery.trim().toLowerCase()
    if (!q) return []
    return buildings.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 6)
  }, [locQuery])

  useEffect(() => {
    if (!showInvite) return
    const onDown = (e: MouseEvent) => {
      if (inviteRef.current && !inviteRef.current.contains(e.target as Node)) setShowInvite(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showInvite])

  const inviteResults = useMemo(() => {
    const q = inviteQuery.trim().toLowerCase()
    return store.users
      .filter(
        (u) =>
          u.id !== 'u-guest' &&
          u.id !== me.id &&
          !invitees.includes(u.id) &&
          (q === '' || u.name.toLowerCase().includes(q)),
      )
      .slice(0, 6)
  }, [inviteQuery, invitees, store.users, me.id])

  const locationChosen = Boolean(buildingId) || (isCustom && locQuery.trim().length > 0)

  const errors = {
    title: !title.trim(),
    location: !locationChosen,
    invitees: audienceKind === 'people' && invitees.length === 0,
  }

  const toggleTag = (id: string) =>
    setSelectedTags((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConflictError(null)
    if (errors.title || errors.location || errors.invitees) {
      setShowErrors(true)
      return
    }

    // Resolve host.
    let hostType: 'individual' | 'club' | 'eatingClub' = 'individual'
    let hostId = me.id
    let hostName = me.name
    if (hostValue !== 'me') {
      const club = store.clubs.find((c) => c.id === hostValue)
      if (club) {
        hostType = club.kind
        hostId = club.id
        hostName = club.name
      }
    }

    // Resolve location (register an ad-hoc building for a custom place). Only
    // attach coordinates if the user actually placed a pin - otherwise the event
    // shows the name but no map.
    let resolvedBuildingId = buildingId
    if (!resolvedBuildingId && isCustom) {
      const custom: Building = {
        id: `b-custom-${Date.now().toString(36)}`,
        name: locQuery.trim(),
        ...(customLatLng ? { lat: customLatLng.lat, lng: customLatLng.lng } : {}),
      }
      store.addBuilding(custom)
      resolvedBuildingId = custom.id
    }

    // Build ISO start/end (end before start → next day).
    const start = new Date(`${date}T${startTime}`)
    let end = new Date(`${date}T${endTime}`)
    if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86_400_000)

    // Build the audience (absent = everyone).
    let audience: EventAudience | undefined
    if (audienceKind === 'club' && hostClub) audience = { kind: 'club', clubId: hostClub.id }
    else if (audienceKind === 'people') audience = { kind: 'people', userIds: invitees }

    const result = store.createEvent({
      title: title.trim(),
      description: description.trim(),
      hostType,
      hostId,
      hostName,
      buildingId: resolvedBuildingId as string,
      start: start.toISOString(),
      end: end.toISOString(),
      accessType,
      audience,
      tags: selectedTags,
      reservationConfirmed: hasReservation,
    })

    if (!result.ok) {
      setConflictError(
        'conflict' in result
          ? `This space is already reserved for ${result.conflict.title} at that time.`
          : result.error,
      )
      return
    }

    push(hasReservation ? 'Reservation locked' : 'Event posted', 'success')
    navigate(`/event/${result.event.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
      <h1 className="mb-1 font-brand text-[24px] font-extrabold leading-tight tracking-tight text-pink-900 sm:text-[28px]">
        Create an event
      </h1>
      <p className="mb-5 text-[14px] text-muted">Post something for your club or campus.</p>

      <form onSubmit={onSubmit} noValidate>
        <div className="divide-y divide-border-muted rounded-md border border-border bg-white px-4 shadow-hoagie sm:px-6">
        {/* Details */}
        <section className={sectionCls}>
          <label className={labelCls} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Terrace Jazz Night"
          />
          {showErrors && errors.title && (
            <p className="mt-1 text-[12px] text-danger">Give your event a title.</p>
          )}

          <label className={`${labelCls} mt-4`} htmlFor="desc">
            Description
          </label>
          <textarea
            id="desc"
            className={`${inputCls} h-auto min-h-[88px] resize-y py-2.5`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's happening, who's it for, what to bring…"
          />
        </section>

        {/* Post as */}
        <section className={sectionCls}>
          <label className={labelCls} htmlFor="host">
            Post as
          </label>
          <select
            id="host"
            className={inputCls}
            value={hostValue}
            onChange={(e) => setHostValue(e.target.value)}
          >
            <option value="me">Yourself - {me.name}</option>
            {adminClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.kind === 'eatingClub' ? 'Eating Club' : 'Club'})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-muted">
            {adminClubs.length > 0
              ? 'Clubs and eating clubs post through their admins.'
              : 'You can post as yourself. Club posting is limited to club admins.'}
          </p>
        </section>

        {/* When & where */}
        <section className={sectionCls}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="start">
                Starts
              </label>
              <input
                id="start"
                type="time"
                className={inputCls}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="end">
                Ends
              </label>
              <input
                id="end"
                type="time"
                className={inputCls}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location autocomplete */}
          <div className="relative mt-4" ref={locRef}>
            <label className={labelCls} htmlFor="loc">
              Location
            </label>
            <div className="relative">
              <MapPinIcon
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="loc"
                className={`${inputCls} pl-9`}
                value={locQuery}
                autoComplete="off"
                onFocus={() => setShowSuggest(true)}
                onChange={(e) => {
                  setLocQuery(e.target.value)
                  setBuildingId(null)
                  setIsCustom(false)
                  setCustomLatLng(null)
                  setShowSuggest(true)
                }}
                placeholder="Search campus buildings…"
              />
            </div>
            {showSuggest && locQuery.trim() && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-white p-1 shadow-hoagie">
                {suggestions.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBuildingId(b.id)
                      setLocQuery(b.name)
                      setIsCustom(false)
                      setShowSuggest(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[14px] transition-colors hover:bg-pink-25"
                  >
                    <MapPinIcon size={15} className="shrink-0 text-muted" />
                    {b.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustom(true)
                    setBuildingId(null)
                    setShowSuggest(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[14px] text-pink-600 transition-colors hover:bg-pink-25"
                >
                  <PlusIcon size={15} className="shrink-0" />
                  Add “{locQuery.trim()}” as a new location
                </button>
              </div>
            )}
            {isCustom && (
              <div className="mt-2">
                <p className="mb-1.5 text-[12px] text-muted">
                  Tap the map to drop a pin for &ldquo;{locQuery.trim()}&rdquo; - or skip it and
                  we&rsquo;ll just show the name.
                </p>
                <LocationPicker value={customLatLng} onChange={setCustomLatLng} />
                {customLatLng ? (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-pink-600">
                    <CheckIcon size={13} />
                    Pinned - this spot will show on the map.
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12px] text-muted">No pin yet - no map will be shown.</p>
                )}
              </div>
            )}
            {showErrors && errors.location && (
              <p className="mt-1 text-[12px] text-danger">Pick or add a location.</p>
            )}
          </div>
        </section>

        {/* Access type */}
        <section className={sectionCls}>
          <span className={labelCls}>Who can come?</span>
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
          {accessType === 'guestlist' && (
            <p className="mt-2.5 rounded-md bg-surface px-3 py-2 text-[12px] leading-relaxed text-muted">
              Attendees request to join and you approve them. Members with your club badge are
              auto-accepted.
            </p>
          )}
        </section>

        {/* Audience - who can see the post */}
        <section className={sectionCls}>
          <span className={labelCls}>Who can see this?</span>
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-2.5 transition-colors hover:bg-surface has-[:checked]:bg-pink-50">
              <input
                type="radio"
                name="audience"
                className="mt-0.5 accent-pink-500"
                checked={audienceKind === 'everyone'}
                onChange={() => setAudienceKind('everyone')}
              />
              <span>
                <span className="block text-[14px] font-medium text-text">Everyone</span>
                <span className="block text-[12px] text-muted">Anyone on campus can find it.</span>
              </span>
            </label>

            {hostClub && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-2.5 transition-colors hover:bg-surface has-[:checked]:bg-pink-50">
                <input
                  type="radio"
                  name="audience"
                  className="mt-0.5 accent-pink-500"
                  checked={audienceKind === 'club'}
                  onChange={() => setAudienceKind('club')}
                />
                <span>
                  <span className="block text-[14px] font-medium text-text">
                    {hostClub.name} members only
                  </span>
                  <span className="block text-[12px] text-muted">
                    Only people who hold the {hostClub.name} badge see it.
                  </span>
                </span>
              </label>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-2.5 transition-colors hover:bg-surface has-[:checked]:bg-pink-50">
              <input
                type="radio"
                name="audience"
                className="mt-0.5 accent-pink-500"
                checked={audienceKind === 'people'}
                onChange={() => setAudienceKind('people')}
              />
              <span>
                <span className="block text-[14px] font-medium text-text">Specific people</span>
                <span className="block text-[12px] text-muted">
                  Only the people you invite by name can see it.
                </span>
              </span>
            </label>
          </div>

          {audienceKind === 'people' && (
            <div className="relative mt-3" ref={inviteRef}>
              {invitees.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {invitees.map((uid) => {
                    const u = store.users.find((x) => x.id === uid)
                    if (!u) return null
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-pink-50 py-1 pl-1 pr-2 text-[13px] font-medium text-pink-700"
                      >
                        <Avatar user={u} size={18} />
                        {u.name}
                        <button
                          type="button"
                          aria-label={`Remove ${u.name}`}
                          onClick={() => setInvitees((s) => s.filter((x) => x !== uid))}
                          className="text-pink-400 transition-colors hover:text-pink-700"
                        >
                          <XIcon size={13} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
              <input
                className={inputCls}
                value={inviteQuery}
                autoComplete="off"
                onFocus={() => setShowInvite(true)}
                onChange={(e) => {
                  setInviteQuery(e.target.value)
                  setShowInvite(true)
                }}
                placeholder="Add people by name…"
              />
              {showInvite && inviteResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-white p-1 shadow-hoagie">
                  {inviteResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setInvitees((s) => [...s, u.id])
                        setInviteQuery('')
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[14px] transition-colors hover:bg-pink-25"
                    >
                      <Avatar user={u} size={22} />
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
              {showErrors && errors.invitees && (
                <p className="mt-1 text-[12px] text-danger">Add at least one person.</p>
              )}
            </div>
          )}
        </section>

        {/* Tags */}
        <section className={sectionCls}>
          <span className={labelCls}>Tags</span>
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
        </section>

        {/* Reservation */}
        <section className={sectionCls}>
          <button
            type="button"
            onClick={() => setHasReservation((v) => !v)}
            aria-pressed={hasReservation}
            className="flex w-full items-center gap-3 text-left"
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
            <span>
              <span className="block text-[14px] font-medium text-text">
                I have reservation approval for this space.
              </span>
              <span className="block text-[12px] text-muted">
                Locks this building and time so no one can double-book it.
              </span>
            </span>
          </button>
        </section>
        </div>

        {conflictError && (
          <div className="mt-4 rounded-md border border-danger/40 bg-danger-bg p-3 text-[13px] font-medium text-danger">
            {conflictError}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit">Post event</Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
