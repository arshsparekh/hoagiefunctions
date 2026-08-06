import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import {
  notificationHref,
  notificationAccent,
  relativeTime,
  type AppNotification,
} from '../lib/notifications'
import EmptyState from '../components/ui/EmptyState'
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  UsersIcon,
  ClockIcon,
  MessageIcon,
} from '../components/icons'

const ACCENT_CLS = {
  success: 'bg-success-bg text-[#2E8B67]',
  pink: 'bg-pink-50 text-pink-600',
  muted: 'bg-surface text-muted',
} as const

function iconFor(kind: AppNotification['kind']) {
  switch (kind) {
    case 'newEventFromFollowed':
    case 'eventUpdated':
      return CalendarIcon
    case 'membershipApproved':
    case 'newApplication':
      return UsersIcon
    case 'newComment':
      return MessageIcon
    case 'applicationApproved':
    case 'autoAccepted':
    case 'promotedFromWaitlist':
      return CheckIcon
    default:
      return ClockIcon
  }
}

export default function Notifications() {
  // Subscribe to the whole store (not a new-array selector, which would loop the
  // getSnapshot cache) and derive the list in render.
  const store = useStore()
  const notifs = store.myNotifications()
  const markAll = store.markAllNotificationsRead

  // Remember what was unread on entry so we can highlight it this visit, then
  // clear the badge as soon as the page is seen.
  const [freshIds] = useState(() => new Set(notifs.filter((n) => !n.read).map((n) => n.id)))
  useEffect(() => {
    markAll()
  }, [markAll])

  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
      <h1 className="mb-1 font-brand text-[24px] font-extrabold leading-tight tracking-tight text-pink-900 sm:text-[28px]">
        Notifications
      </h1>
      <p className="mb-5 text-[14px] text-muted">
        Approvals, waitlist spots, and new events from clubs and people you follow.
      </p>

      {notifs.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={26} />}
          title="You're all caught up"
          message="Follow a club or person and you'll hear about their events here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifs.map((n) => {
            const Ico = iconFor(n.kind)
            const href = notificationHref(n)
            const fresh = freshIds.has(n.id)
            const inner = (
              <div
                className={`flex items-start gap-3 rounded-md border p-3 shadow-hoagie transition-colors ${
                  fresh ? 'border-pink-200 bg-pink-25' : 'border-border bg-white'
                } ${href ? 'hover:border-pink-300' : ''}`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    ACCENT_CLS[notificationAccent(n.kind)]
                  }`}
                >
                  <Ico size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[14px] font-semibold text-text">{n.title}</p>
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {relativeTime(n.ts)}
                    </span>
                  </div>
                  {n.body && <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>}
                </div>
                {fresh && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pink-500" />}
              </div>
            )
            return (
              <li key={n.id}>
                {href ? (
                  <Link to={href} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
