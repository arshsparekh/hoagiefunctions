// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../../store'
import SaveButton from './SaveButton'

beforeEach(() => {
  useStore.getState().resetDemo()
})

describe('SaveButton', () => {
  it('toggles saved state in the store and reflects it in the label', () => {
    render(<SaveButton eventId="ev-eclub-gbm" variant="labeled" />)
    const btn = screen.getByRole('button')

    expect(btn).toHaveTextContent('Save')
    expect(useStore.getState().isSaved('ev-eclub-gbm')).toBe(false)

    fireEvent.click(btn)

    expect(useStore.getState().isSaved('ev-eclub-gbm')).toBe(true)
    expect(screen.getByRole('button')).toHaveTextContent('Saved')

    fireEvent.click(screen.getByRole('button'))
    expect(useStore.getState().isSaved('ev-eclub-gbm')).toBe(false)
  })
})
