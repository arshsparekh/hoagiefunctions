// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../../store'
import FollowButton from './FollowButton'

beforeEach(() => {
  useStore.getState().resetWorld()
  useStore.setState({ sessionUserId: 'u-arsh' })
})

describe('FollowButton', () => {
  it('follows and unfollows a target for the current user', () => {
    render(<FollowButton id="e-club" name="Hoagie Club" />)

    const follow = screen.getByRole('button', { name: /follow hoagie club/i })
    fireEvent.click(follow)
    expect(useStore.getState().isFollowing('e-club')).toBe(true)

    const unfollow = screen.getByRole('button', { name: /unfollow hoagie club/i })
    fireEvent.click(unfollow)
    expect(useStore.getState().isFollowing('e-club')).toBe(false)
  })
})
