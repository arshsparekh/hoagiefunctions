import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store'
import { useToasts } from '../lib/toast'
import { FILL_STYLES } from '../lib/fills'
import type { User } from '../data/seed'
import EventCard from '../components/ui/EventCard'
import FollowButton from '../components/ui/FollowButton'
import Button from '../components/ui/Button'
import Fill from '../components/ui/Fill'
import Avatar from '../components/ui/Avatar'
import ClassYearBadge from '../components/ui/ClassYearBadge'
import SectionHeader from '../components/ui/SectionHeader'
import EmptyState from '../components/ui/EmptyState'
import { ArrowLeftIcon, CheckIcon, PlusIcon, CalendarIcon } from '../components/icons'

export default function ClubDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useStore()
  const push = useToasts((s) => s.push)
  const [transferTo, setTransferTo] = useState('')

  const club = store.clubs.find((c) => c.id === id)

  if (!club) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <EmptyState
          title="Club not found"
          message="This club may have been removed."
          action={
            <Button size="sm" onClick={() => navigate('/')}>
              Back to feed
            </Button>
          }
        />
      </div>
    )
  }

  const me = store.currentUser()
  const userById = new Map(store.users.map((u) => [u.id, u]))
  const resolve = (ids: string[]) =>
    ids.map((uid) => userById.get(uid)).filter((u): u is User => Boolean(u))

  const admins = resolve(club.adminIds)
  const pending = resolve(club.pendingIds)
  const kindLabel = club.kind === 'eatingClub' ? 'Eating Club' : 'Club'
  const nameColor = FILL_STYLES[club.colorFill].text

  const isMember = club.memberIds.includes(me.id)
  const isPending = club.pendingIds.includes(me.id)
  const isAdmin = club.adminIds.includes(me.id)

  const clubEvents = store
    .eventsSorted()
    .filter((e) => e.hostId === club.id && new Date(e.end).getTime() >= Date.now())

  // Members this admin could hand the club to (anyone but themselves).
  const transferCandidates = resolve(club.memberIds).filter((u) => u.id !== me.id)

  const onTransfer = () => {
    if (!transferTo) return
    const target = userById.get(transferTo)
    const r = store.transferAdmin(club.id, transferTo)
    if (!r.ok) {
      push(r.reason ?? 'Could not pass admin', 'danger')
      return
    }
    push(`Passed admin to ${target?.name ?? 'member'}`, 'success')
    setTransferTo('')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-text"
      >
        <ArrowLeftIcon size={16} />
        Back
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1
          className="font-brand text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]"
          style={{ color: nameColor }}
        >
          {club.name}
        </h1>
        <Fill fill={club.colorFill}>{kindLabel}</Fill>
        <FollowButton id={club.id} name={club.name} size={26} />
      </div>
      <p className="mt-1 text-[13px] text-muted">{club.memberIds.length} members</p>
      <p className="mt-3 text-[14px] leading-relaxed text-text">{club.description}</p>

      {/* Membership button */}
      <div className="mt-5">
        {isMember ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-success-bg px-3 py-2 text-[14px] font-semibold text-[#2E8B67]">
              <CheckIcon size={16} />
              Member
            </span>
            {!isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const r = store.leaveClub(club.id)
                  push(r.ok ? `Left ${club.name}` : (r.reason ?? 'Could not leave'), r.ok ? 'neutral' : 'danger')
                }}
              >
                Leave club
              </Button>
            )}
            {isAdmin && (
              <span className="text-[12px] text-muted">Pass admin to leave the club.</span>
            )}
          </div>
        ) : isPending ? (
          <div className="flex items-center gap-3">
            <Button variant="secondary" disabled>
              Request pending
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                store.leaveClub(club.id)
                push('Request canceled', 'neutral')
              }}
            >
              Cancel request
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              store.joinClub(club.id)
              push('Request sent', 'neutral')
            }}
          >
            Join club
          </Button>
        )}
      </div>

      {/* Admins + succession */}
      <section className="mt-8">
        <SectionHeader title="Admins" subtitle="Admins pass down as classes graduate." />
        <ul className="flex flex-col gap-2">
          {admins.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-md border border-border bg-white p-3 shadow-hoagie"
            >
              <Avatar user={u} size={32} />
              <span className="flex-1 truncate text-[14px] font-medium text-text">{u.name}</span>
              <ClassYearBadge classYear={u.classYear} />
              <Fill fill="purple">Admin</Fill>
            </li>
          ))}
        </ul>

        {isAdmin && transferCandidates.length > 0 && (
          <div className="mt-3 rounded-md border border-border bg-surface p-3">
            <p className="text-[13px] font-medium text-text">Pass admin to a member</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="h-9 min-w-[180px] flex-1 rounded-md border border-border bg-white px-2 text-[14px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
              >
                <option value="">Choose a member…</option>
                {transferCandidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={onTransfer} disabled={!transferTo}>
                Pass admin
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Pending requests (admins only) */}
      {isAdmin && (
        <section className="mt-8">
          <SectionHeader title="Pending requests" subtitle={`${pending.length} waiting`} />
          <p className="mb-3 text-[13px] text-muted">
            Approving grants membership and the {club.name} badge - they&rsquo;re then
            auto-accepted into this club&rsquo;s guestlist events.
          </p>
          {pending.length === 0 ? (
            <div className="rounded-md border border-border bg-surface px-4 py-6 text-center text-[13px] text-muted">
              No pending requests.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-white p-3 shadow-hoagie"
                >
                  <Avatar user={u} size={32} />
                  <span className="flex-1 truncate text-[14px] font-medium text-text">
                    {u.name}
                  </span>
                  <ClassYearBadge classYear={u.classYear} />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const r = store.approveMember(club.id, u.id)
                        push(r.ok ? `Approved ${u.name}` : (r.reason ?? 'Not allowed'), r.ok ? 'success' : 'danger')
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const r = store.denyMember(club.id, u.id)
                        push(r.ok ? `Denied ${u.name}` : (r.reason ?? 'Not allowed'), 'neutral')
                      }}
                    >
                      Deny
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Upcoming events */}
      <section className="mt-8">
        <SectionHeader
          title="Upcoming events"
          action={
            isAdmin ? (
              <Link
                to={`/create?host=${club.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-pink-500 px-3 text-[13px] font-semibold text-white shadow-hoagie transition-colors hover:bg-pink-600"
              >
                <PlusIcon size={16} />
                Create event
              </Link>
            ) : undefined
          }
        />
        {clubEvents.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={26} />}
            title="No upcoming events"
            message={`${club.name} hasn't posted anything yet.`}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {clubEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
