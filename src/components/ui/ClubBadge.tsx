import Fill from './Fill'
import { CheckIcon } from '../icons'
import { isConfirmedMember } from '../../lib/membership'
import type { Club, User } from '../../data/seed'

/**
 * A club's name in its own fill color. Shows a check when the given user is a
 * confirmed member (they "hold the badge").
 */
export default function ClubBadge({ club, user }: { club: Club; user?: User }) {
  const member = isConfirmedMember(user, club)
  return (
    <Fill fill={club.colorFill} icon={member ? <CheckIcon size={12} /> : undefined}>
      {club.name}
    </Fill>
  )
}
