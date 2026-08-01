import type { User } from '../../data/seed'

/** First-name + last-name initials, e.g. "Arsh Parekh" → "AP". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const chars = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')
  return chars.toUpperCase() || '?'
}

/** Initials on a circle filled with the user's avatarColor. */
export default function Avatar({
  user,
  size = 28,
  ring = false,
}: {
  user: User
  size?: number
  /** White ring - used to separate overlapping avatars in a stack. */
  ring?: boolean
}) {
  return (
    <span
      title={user.name}
      style={{ backgroundColor: user.avatarColor, width: size, height: size, fontSize: size * 0.4 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white ${
        ring ? 'ring-2 ring-white' : ''
      }`}
    >
      {initials(user.name)}
    </span>
  )
}

/** Overlapping row of avatars, with a "+N" chip when there are more than `max`. */
export function AvatarStack({
  users,
  max = 4,
  size = 26,
}: {
  users: User[]
  max?: number
  size?: number
}) {
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  const overlap = Math.round(size * 0.32)

  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <span
          key={u.id}
          className="relative"
          style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: shown.length - i }}
        >
          <Avatar user={u} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="relative inline-flex items-center justify-center rounded-full bg-surface font-semibold text-muted ring-2 ring-white"
          style={{ marginLeft: -overlap, width: size, height: size, fontSize: size * 0.36 }}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}
