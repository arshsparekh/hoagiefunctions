import L from 'leaflet'

/**
 * Purple teardrop pin as a Leaflet divIcon (sidesteps Leaflet's broken default
 * PNG marker under bundlers). Fixed 40×52 canvas, tip at (20,44):
 *  - `reserved` draws an orange ring around the head.
 *  - `count > 1` stamps a small count badge.
 */
export function buildPinIcon(reserved: boolean, count: number): L.DivIcon {
  const ring = reserved
    ? '<circle cx="20" cy="18" r="16.5" fill="none" stroke="#DE7548" stroke-width="3"/>'
    : ''
  const badge =
    count > 1
      ? `<circle cx="31" cy="8" r="8" fill="#BE185D" stroke="#ffffff" stroke-width="1.5"/>
         <text x="31" y="8" text-anchor="middle" dominant-baseline="central"
           font-family="Inter, sans-serif" font-size="9" font-weight="700" fill="#ffffff">${count}</text>`
      : ''
  const html = `<svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
    ${ring}
    <path d="M20 44 C 20 44 32 30 32 18 A 12 12 0 1 0 8 18 C 8 30 20 44 20 44 Z"
      fill="#DB2777" stroke="#ffffff" stroke-width="2.5"/>
    <circle cx="20" cy="18" r="4.5" fill="#ffffff"/>
    ${badge}
  </svg>`

  return L.divIcon({
    className: 'hf-pin',
    html,
    iconSize: [40, 52],
    iconAnchor: [20, 44],
    popupAnchor: [0, -42],
  })
}
