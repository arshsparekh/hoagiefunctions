import Fill from './Fill'
import { tagById } from '../../store'

/**
 * A tag pill by tagId (label + colorFill via tagById). Used on events and as a
 * filter chip: pass `onClick` to make it a button and `active` to render it solid.
 */
export default function TagChip({
  tagId,
  active = false,
  onClick,
}: {
  tagId: string
  active?: boolean
  onClick?: () => void
}) {
  const tag = tagById[tagId]
  if (!tag) return null

  const pill = (
    <Fill fill={tag.colorFill} solid={active}>
      {tag.label}
    </Fill>
  )

  if (!onClick) return pill
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 active:scale-95"
    >
      {pill}
    </button>
  )
}
