import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPinIcon } from '../icons'

// A purple teardrop pin as a Leaflet divIcon (avoids the bundler broken-image
// issue with Leaflet's default PNG markers).
const purplePin = L.divIcon({
  className: 'hf-pin',
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 39C15 39 27 24.5 27 14A12 12 0 1 0 3 14C3 24.5 15 39 15 39Z"
      fill="#DB2777" stroke="#ffffff" stroke-width="2"/>
    <circle cx="15" cy="14" r="4.5" fill="#ffffff"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 39],
})

/** Small non-scroll-hijacking Leaflet map centered on a building, with one pin. */
export default function MiniMap({
  lat,
  lng,
  name,
  zoom = 16,
}: {
  lat: number
  lng: number
  name: string
  zoom?: number
}) {
  return (
    // `isolate` keeps Leaflet's high z-index panes contained so modals/overlays
    // (e.g. the edit-event modal) render above the map instead of under it.
    <div className="isolate overflow-hidden rounded-md border border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: 200, width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <Marker position={[lat, lng]} icon={purplePin} />
      </MapContainer>
      <div className="flex items-center gap-1.5 border-t border-border bg-surface px-3 py-2 text-[13px] font-medium text-text">
        <MapPinIcon size={15} className="shrink-0 text-pink-500" />
        {name}
      </div>
    </div>
  )
}
