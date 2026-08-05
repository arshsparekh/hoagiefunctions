import { describe, it, expect } from 'vitest'
import { buildIcs, icsFileName } from './ics'

describe('buildIcs', () => {
  const ics = buildIcs(
    {
      id: 'ev-1',
      title: 'Terrace Jazz, Night',
      description: 'line one\nline two',
      location: 'Terrace Club',
      start: '2026-08-06T21:00:00.000Z',
      end: '2026-08-06T23:00:00.000Z',
      url: 'https://example.com/event/ev-1',
    },
    '2026-08-05T12:00:00.000Z',
  )

  it('emits a well-formed VEVENT with UTC stamps', () => {
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('UID:ev-1@hoagiefunctions')
    expect(ics).toContain('DTSTART:20260806T210000Z')
    expect(ics).toContain('DTEND:20260806T230000Z')
    expect(ics).toContain('DTSTAMP:20260805T120000Z')
  })

  it('escapes commas and newlines per RFC 5545', () => {
    expect(ics).toContain('SUMMARY:Terrace Jazz\\, Night')
    expect(ics).toContain('DESCRIPTION:line one\\nline two')
  })

  it('uses CRLF line endings', () => {
    expect(ics.includes('\r\n')).toBe(true)
  })
})

describe('icsFileName', () => {
  it('slugifies the title', () => {
    expect(icsFileName('Terrace Jazz Night!')).toBe('terrace-jazz-night.ics')
    expect(icsFileName('   ')).toBe('event.ics')
  })
})
