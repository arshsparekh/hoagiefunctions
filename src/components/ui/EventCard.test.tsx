// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useStore } from '../../store'
import EventCard from './EventCard'

beforeEach(() => {
  useStore.getState().resetDemo()
})

describe('EventCard', () => {
  it('renders the event title, host, and links to the detail page', () => {
    const event = useStore.getState().events.find((e) => e.id === 'ev-eclub-gbm')
    expect(event).toBeTruthy()

    render(
      <MemoryRouter>
        <EventCard event={event!} />
      </MemoryRouter>,
    )

    expect(screen.getByText(event!.title)).toBeInTheDocument()
    expect(screen.getByText('Hoagie Club')).toBeInTheDocument()
    // The whole card is a link to the event detail page.
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/event/ev-eclub-gbm')
  })
})
