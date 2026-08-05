import { useStore } from '../../store'
import { useToasts } from '../../lib/toast'
import { BookmarkIcon } from '../icons'

/**
 * Bookmark toggle for an event. Saved events are per-user and persisted; they
 * show up in the "Saved" section on the profile. Two variants: an icon-only
 * button (for cards) and a labeled button (for the detail page).
 */
export default function SaveButton({
  eventId,
  variant = 'icon',
  size = 18,
}: {
  eventId: string
  variant?: 'icon' | 'labeled'
  size?: number
}) {
  const saved = useStore((s) => s.isSaved(eventId))
  const toggleSave = useStore((s) => s.toggleSave)
  const push = useToasts((s) => s.push)

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSave(eventId)
    push(saved ? 'Removed from saved' : 'Saved', saved ? 'neutral' : 'success')
  }

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-[13px] font-semibold transition-colors ${
          saved
            ? 'border-pink-300 bg-pink-50 text-pink-600'
            : 'border-border bg-white text-text hover:bg-surface'
        }`}
      >
        <BookmarkIcon size={16} filled={saved} />
        {saved ? 'Saved' : 'Save'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? 'Remove from saved' : 'Save event'}
      aria-pressed={saved}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
        saved ? 'text-pink-600 hover:bg-pink-50' : 'text-muted hover:bg-surface hover:text-text'
      }`}
    >
      <BookmarkIcon size={size} filled={saved} />
    </button>
  )
}
