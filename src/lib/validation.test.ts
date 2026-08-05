import { describe, it, expect } from 'vitest'
import {
  sanitizeText,
  sanitizeSingleLine,
  clampInt,
  validateEventDraft,
  hasErrors,
  LIMITS,
} from './validation'

const NOW = Date.parse('2026-08-05T12:00:00Z')
const future = (h: number) => new Date(NOW + h * 3_600_000).toISOString()

describe('sanitizeText', () => {
  it('strips control and zero-width characters but keeps newlines/tabs', () => {
    const zwsp = String.fromCharCode(0x200b) // zero-width space
    const nul = String.fromCharCode(0) // NUL control char
    const dirty = `Hello${zwsp} world${nul}\tthere\nline`
    expect(sanitizeText(dirty)).toBe('Hello world\tthere\nline')
  })

  it('collapses 3+ blank lines and trims', () => {
    expect(sanitizeText('  a\n\n\n\nb  ')).toBe('a\n\nb')
  })
})

describe('sanitizeSingleLine', () => {
  it('collapses all whitespace runs to single spaces', () => {
    expect(sanitizeSingleLine('  Terrace   Jazz\n\tNight ')).toBe('Terrace Jazz Night')
  })
})

describe('clampInt', () => {
  it('clamps and rounds', () => {
    expect(clampInt(5.6, 1, 10)).toBe(6)
    expect(clampInt(-3, 1, 10)).toBe(1)
    expect(clampInt(999, 1, 10)).toBe(10)
  })
  it('returns undefined for non-finite', () => {
    expect(clampInt(NaN, 1, 10)).toBeUndefined()
  })
})

describe('validateEventDraft', () => {
  const base = {
    title: 'Study Jam',
    description: 'come study',
    location: 'Frist',
    start: future(2),
    end: future(4),
  }

  it('accepts a well-formed draft', () => {
    expect(hasErrors(validateEventDraft(base, NOW))).toBe(false)
  })

  it('rejects a too-short title', () => {
    expect(validateEventDraft({ ...base, title: 'ab' }, NOW).title).toBeTruthy()
  })

  it('rejects a title over the limit', () => {
    expect(
      validateEventDraft({ ...base, title: 'x'.repeat(LIMITS.titleMax + 1) }, NOW).title,
    ).toBeTruthy()
  })

  it('rejects end before start', () => {
    expect(validateEventDraft({ ...base, start: future(4), end: future(2) }, NOW).time).toBeTruthy()
  })

  it('rejects an event longer than a day', () => {
    expect(validateEventDraft({ ...base, start: future(1), end: future(30) }, NOW).time).toBeTruthy()
  })

  it('rejects a start in the past', () => {
    expect(validateEventDraft({ ...base, start: future(-5), end: future(-3) }, NOW).time).toBeTruthy()
  })

  it('rejects an out-of-range capacity', () => {
    expect(validateEventDraft({ ...base, capacity: 0 }, NOW).capacity).toBeTruthy()
    expect(validateEventDraft({ ...base, capacity: 1 }, NOW).capacity).toBeUndefined()
  })

  it('rejects a missing location', () => {
    expect(validateEventDraft({ ...base, location: '   ' }, NOW).location).toBeTruthy()
  })
})
