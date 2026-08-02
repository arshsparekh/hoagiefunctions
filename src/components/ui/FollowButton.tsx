import { useStore } from '../../store'
import { useToasts } from '../../lib/toast'
import { PlusIcon, CheckIcon } from '../icons'

/**
 * Small circular follow toggle (pink). Works for clubs and people - `id` is the
 * club id or user id. Following powers the (demo-only) notifications idea: you'd
 * get pinged about events from the clubs and people you follow.
 */
export default function FollowButton({
  id,
  name,
  size = 28,
}: {
  id: string
  name: string
  size?: number
}) {
  const following = useStore((s) => s.following.includes(id))
  const toggleFollow = useStore((s) => s.toggleFollow)
  const push = useToasts((s) => s.push)

  return (
    <button
      type="button"
      aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
      title={following ? `Following ${name}` : `Follow ${name}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFollow(id)
        push(following ? `Unfollowed ${name}` : `Now following ${name}`, following ? 'neutral' : 'success')
      }}
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-pink-500 transition-colors ${
        following ? 'bg-pink-500 text-white' : 'bg-white text-pink-600 hover:bg-pink-50'
      }`}
    >
      {following ? <CheckIcon size={Math.round(size * 0.55)} /> : <PlusIcon size={Math.round(size * 0.55)} />}
    </button>
  )
}
