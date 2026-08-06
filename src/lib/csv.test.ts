import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('joins rows with CRLF and cells with commas', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(toCsv([['Doe, Jane', 'she said "hi"', 'a\nb']])).toBe('"Doe, Jane","she said ""hi""","a\nb"')
  })
})
