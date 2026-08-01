import type { CampusEvent, Club, User } from '../data/seed'

/**
 * Can `user` manage `event` (edit it, run the door)? The individual host, or an
 * admin of the hosting club/eating club.
 */
export function canManageEvent(event: CampusEvent, user: User): boolean {
  return event.hostType === 'individual'
    ? event.hostId === user.id
    : user.adminOf.includes(event.hostId)
}

/**
 * Can `user` discover `event`? Absent audience = everyone. Hosts and club admins
 * always see their own postings.
 */
export function canSeeEvent(event: CampusEvent, user: User): boolean {
  const aud = event.audience
  if (!aud || aud.kind === 'everyone') return true

  // The host (individual) or a club admin of the hosting club always sees it.
  if (event.hostType === 'individual') {
    if (event.hostId === user.id) return true
  } else if (user.adminOf.includes(event.hostId)) {
    return true
  }

  if (aud.kind === 'people') return aud.userIds.includes(user.id)

  // club audience: confirmed member (badge or membership) or an admin of it
  if (user.eatingClubId === aud.clubId) return true
  if (user.adminOf.includes(aud.clubId)) return true
  return user.clubMemberships.some((m) => m.clubId === aud.clubId && m.status === 'member')
}

/** Short label for a restricted event, or null when it's open to everyone. */
export function audienceLabel(event: CampusEvent, clubs: Club[]): string | null {
  const aud = event.audience
  if (!aud || aud.kind === 'everyone') return null
  if (aud.kind === 'people') return 'Invite only'
  const club = clubs.find((c) => c.id === aud.clubId)
  return club ? `${club.name} only` : 'Members only'
}
