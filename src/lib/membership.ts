import type { Club, User } from '../data/seed'

/** True when `user` holds `club`'s badge - a confirmed member or eating-club match. */
export function isConfirmedMember(user: User | undefined, club: Club): boolean {
  if (!user) return false
  if (user.eatingClubId === club.id) return true
  return user.clubMemberships.some((m) => m.clubId === club.id && m.status === 'member')
}
