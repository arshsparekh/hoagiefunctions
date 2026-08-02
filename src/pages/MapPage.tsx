import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore, buildingById } from '../store'
import type { CampusEvent } from '../data/seed'
import { buildPinIcon } from '../lib/mapIcons'
import EventCard from '../components/ui/EventCard'
import TypeFilter from '../components/ui/TypeFilter'

const PRINCETON: [number, number] = [40.3487, -74.6551]
const WEEK_MS = 7 * 86_400_000

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const pillLabel = (d: Date, now: Date) =>
  dayKey(d) === dayKey(now) ? 'Today' : `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`

export default function MapPage() {
  const store = useStore()
  const [showReserved, setShowReserved] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [day, setDay] = useState<string | null>(null)
  const now = new Date()

  const { byBuilding, reservedIds, days } = useMemo(() => {
    const nowMs = Date.now()
    const passesTag = (e: CampusEvent) =>
      selected.length === 0 || e.tags.some((t) => selected.includes(t))
    const passesDay = (e: CampusEvent) => day === null || dayKey(new Date(e.start)) === day

    // Events this user can see and that haven't finished.
    const live = store.visibleEvents().filter((e) => new Date(e.end).getTime() >= nowMs)

    // Days with events -> the date strip (from the tag-filtered set).
    const days = [...new Set(live.filter(passesTag).map((e) => dayKey(new Date(e.start))))]
      .map((k) => {
        const [y, m, d] = k.split('-').map(Number)
        return { key: k, date: new Date(y, m, d) }
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const upcoming = live.filter((e) => passesTag(e) && passesDay(e))
    const byBuilding = new Map<string, CampusEvent[]>()
    const reservedIds = new Set<string>()
    for (const e of upcoming) {
      const list = byBuilding.get(e.buildingId)
      if (list) list.push(e)
      else byBuilding.set(e.buildingId, [e])
      if (e.reservationConfirmed) {
        const start = new Date(e.start).getTime()
        if (start <= nowMs + WEEK_MS) reservedIds.add(e.buildingId)
      }
    }
    for (const list of byBuilding.values()) list.sort((a, b) => (a.start < b.start ? -1 : 1))
    return { byBuilding, reservedIds, days }
  }, [store, selected, day])

  const datePill = (key: string, label: string, active: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? 'bg-pink-500 text-white' : 'border border-border bg-white text-text hover:border-pink-300'
      }`}
    >
      {label}
    </button>
  )

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
          <div className="flex items-center gap-2 rounded-md bg-white/95 p-2 shadow-hoagie backdrop-blur">
            <TypeFilter selected={selected} onChange={setSelected} />
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {datePill('all', 'All dates', day === null, () => setDay(null))}
              {days.map((d) => datePill(d.key, pillLabel(d.date, now), day === d.key, () => setDay(d.key)))}
            </div>
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
