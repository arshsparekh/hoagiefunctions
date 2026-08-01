import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore, tags, buildingById } from '../store'
import type { CampusEvent } from '../data/seed'
import { buildPinIcon } from '../lib/mapIcons'
import EventCard from '../components/ui/EventCard'
import TagChip from '../components/ui/TagChip'
import Fill from '../components/ui/Fill'

const PRINCETON: [number, number] = [40.3487, -74.6551]
const WEEK_MS = 7 * 86_400_000

export default function MapPage() {
  const store = useStore()
  const [showReserved, setShowReserved] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const { byBuilding, reservedIds } = useMemo(() => {
    const now = Date.now()
    const passesTag = (e: CampusEvent) =>
      selected.length === 0 || e.tags.some((t) => selected.includes(t))

    // Only events this user can see, not already finished, matching the filter.
    const upcoming = store
      .visibleEvents()
      .filter((e) => new Date(e.end).getTime() >= now && passesTag(e))

    const byBuilding = new Map<string, CampusEvent[]>()
    const reservedIds = new Set<string>()
    for (const e of upcoming) {
      const list = byBuilding.get(e.buildingId)
      if (list) list.push(e)
      else byBuilding.set(e.buildingId, [e])

      if (e.reservationConfirmed) {
        const start = new Date(e.start).getTime()
        if (start <= now + WEEK_MS) reservedIds.add(e.buildingId)
      }
    }
    for (const list of byBuilding.values()) list.sort((a, b) => (a.start < b.start ? -1 : 1))
    return { byBuilding, reservedIds }
  }, [store, selected])

  const toggleTag = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // Selected filters jump to the front (right after "All") so they're always visible.
  const orderedTags = [
    ...tags.filter((t) => selected.includes(t.id)),
    ...tags.filter((t) => !selected.includes(t.id)),
  ]

  return (
    <div className="relative isolate -mb-24 h-[calc(100dvh-76px)] w-full md:-mb-10">
      <MapContainer
        center={PRINCETON}
        zoom={15}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        {[...byBuilding.entries()].map(([buildingId, evs]) => {
          const b = buildingById[buildingId]
          // Skip locations with no coordinates (ad-hoc places not placed on the map).
          if (!b || b.lat == null || b.lng == null) return null
          const reserved = reservedIds.has(buildingId)
          return (
            <Marker
              key={buildingId}
              position={[b.lat, b.lng]}
              icon={buildPinIcon(showReserved && reserved, evs.length)}
            >
              {showReserved && reserved && (
                <Tooltip permanent direction="top" offset={[0, -44]} className="hf-reserved-tip">
                  Reserved
                </Tooltip>
              )}
              <Popup minWidth={244} maxWidth={288}>
                <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto">
                  <div className="text-[13px] font-semibold text-pink-900">{b.name}</div>
                  {evs.map((e) => (
                    <EventCard key={e.id} event={e} compact />
                  ))}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Floating controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2">
          <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-md bg-white/95 p-2 shadow-hoagie backdrop-blur">
            <button
              type="button"
              onClick={() => setSelected([])}
              aria-pressed={selected.length === 0}
              className="rounded-sm transition-transform focus:outline-none active:scale-95"
            >
              <Fill fill="neutral" solid={selected.length === 0}>
                All
              </Fill>
            </button>
            {orderedTags.map((t) => (
              <TagChip
                key={t.id}
                tagId={t.id}
                active={selected.includes(t.id)}
                onClick={() => toggleTag(t.id)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowReserved((v) => !v)}
            aria-pressed={showReserved}
            className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium shadow-hoagie transition-colors ${
              showReserved
                ? 'border-[#DE7548] bg-[#FBF0EA] text-[#BC5A2C]'
                : 'border-border bg-white text-text'
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full ${showReserved ? 'bg-[#DE7548]' : 'bg-border'}`}
            />
            Show reserved spaces
          </button>
        </div>
      </div>
    </div>
  )
}
