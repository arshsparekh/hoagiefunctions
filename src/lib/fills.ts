import type { FillName } from '../data/seed'

/**
 * The Hoagie "fill" palette - a {text, bg} pair per FillName. Darkened text on a
 * light tint keeps every pill readable. `purple` is the brand fill and now renders
 * pink (the FillName is kept for backwards-compat with seed data / the type).
 */
export const FILL_STYLES: Record<FillName, { text: string; bg: string }> = {
  neutral: { text: '#343434', bg: '#F1F1F1' },
  blue: { text: '#2B4ACB', bg: '#EDF1FF' },
  red: { text: '#C23B3B', bg: '#FDF4F4' },
  orange: { text: '#BC5A2C', bg: '#FBF0EA' },
  yellow: { text: '#8A6410', bg: '#FFFAF2' },
  green: { text: '#2E8B67', bg: '#F5FBF8' },
  teal: { text: '#0E7C74', bg: '#EAF8F6' },
  indigo: { text: '#4338CA', bg: '#E8EBFB' },
  // `purple` is the brand fill and renders pink - reserve it for brand/role UI
  // (e.g. the Admin badge), never for club/tag/avatar palettes.
  purple: { text: '#BE185D', bg: '#FBD5E6' },
}
