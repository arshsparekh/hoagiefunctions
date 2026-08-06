import { useState } from 'react'
import { useStore } from '../../store'
import { useToasts } from '../../lib/toast'
import { relativeTime } from '../../lib/notifications'
import { canManageEvent } from '../../lib/visibility'
import { LIMITS } from '../../lib/validation'
import Avatar from './Avatar'
import Button from './Button'
import SectionHeader from './SectionHeader'
import { XIcon } from '../icons'

/** The discussion thread for an event: a composer plus a list of comments. */
export default function EventComments({ eventId }: { eventId: string }) {
  const store = useStore()
  const push = useToasts((s) => s.push)
  const [body, setBody] = useState('')

  const me = store.currentUser()
  const comments = store.commentsForEvent(eventId)
  const event = store.events.find((e) => e.id === eventId)
  const userById = new Map(store.users.map((u) => [u.id, u]))
  const canModerate = event ? canManageEvent(event, me) : false

  const onPost = () => {
    const r = store.addComment(eventId, body)
    if (!r.ok) {
      push(r.reason ?? 'Could not post', 'danger')
      return
    }
    setBody('')
  }

  return (
    <section className="mt-8">
      <SectionHeader
        title="Discussion"
        subtitle={comments.length ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : undefined}
      />

      {/* Composer */}
      <div className="mb-5 flex gap-2.5">
        <Avatar user={me} size={32} />
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) {
                e.preventDefault()
                onPost()
              }
            }}
            placeholder="Add to the discussion…"
            rows={2}
            maxLength={LIMITS.commentMax}
            className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-[14px] text-text placeholder:text-muted focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={onPost} disabled={!body.trim()}>
              Post
            </Button>
          </div>
        </div>
      </div>

      {/* Thread */}
      {comments.length === 0 ? (
        <p className="text-[13px] text-muted">No comments yet. Start the conversation.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => {
            const u = userById.get(c.userId)
            const canDelete = c.userId === me.id || canModerate
            return (
              <li key={c.id} className="flex gap-2.5">
                {u && <Avatar user={u} size={32} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-text">{u?.name ?? 'Someone'}</span>
                    <span className="font-mono text-[11px] text-muted">{relativeTime(c.ts)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        aria-label="Delete comment"
                        onClick={() => store.deleteComment(c.id)}
                        className="ml-auto flex h-6 w-6 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-danger"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-text">
                    {c.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
