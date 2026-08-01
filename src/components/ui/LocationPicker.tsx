import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { buildPinIcon } from '../../lib/mapIcons'

const PRINCETON: [number, number] = [40.3487, -74.6551]

export type LatLng = { lat: number; lng: number }

function ClickCapture({ onPick }: { onPick: (v: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

/** A small map where the user taps to drop the pin for a custom location. */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null
  onChange: (v: LatLng) => void
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <MapContainer
        center={value ? [value.lat, value.lng] : PRINCETON}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: 200, width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <ClickCapture onPick={onChange} />
        {value && <Marker position={[value.lat, value.lng]} icon={buildPinIcon(false, 1)} />}
      </MapContainer>
    </div>
  )
}
