import { useEffect, useMemo, useState } from 'react'
import { Empty, ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { api } from '../../services/api'
import type { FleetTrackingResponse, FleetTrip } from '../../types'
import AdminNav from './AdminNav'
import LiveVehicleMap from '../../components/LiveVehicleMap'

export default function CarTracking() {
  const [data, setData] = useState<FleetTrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'confirmed'>('all')
  const [search, setSearch] = useState('')
  const [selectedTrip, setSelectedTrip] = useState<FleetTrip | null>(null)
  const [simulatingId, setSimulatingId] = useState<number | null>(null)

  const loadData = () => {
    api.admin.tracking()
      .then(res => {
        setData(res)
        if (!selectedTrip && res.trips.length > 0) {
          const active = res.trips.find(t => t.booking_status === 'active') ?? res.trips[0]
          setSelectedTrip(active)
        } else if (selectedTrip) {
          const updated = res.trips.find(t => t.booking_id === selectedTrip.booking_id)
          if (updated) setSelectedTrip(updated)
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(() => {
      api.admin.tracking().then(res => setData(res)).catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const filteredTrips = useMemo(() => {
    if (!data) return []
    return data.trips.filter(t => {
      if (filter !== 'all' && t.booking_status !== filter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        t.car.brand.toLowerCase().includes(q) ||
        t.car.model.toLowerCase().includes(q) ||
        t.customer.name.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.current_location.toLowerCase().includes(q) ||
        t.trip_route.toLowerCase().includes(q) ||
        t.booking_reference.toLowerCase().includes(q)
      )
    })
  }, [data, filter, search])

  // Simulate advancing the car along its route
  const handleSimulatePing = async (trip: FleetTrip) => {
    setSimulatingId(trip.booking_id)
    try {
      const nextKm = trip.distance_travelled_km + Math.floor(Math.random() * 15 + 10)
      const nextSpeed = Math.floor(Math.random() * 25 + 45)
      const nextBattery = Math.max(10, trip.fuel_or_battery_level - Math.floor(Math.random() * 3 + 1))
      const checkpoints = [
        'Forest Checkpost Point',
        'Hilltop Highway Rest Area',
        'Ghat Viewpoint Checkpoint',
        'Valley Bridge Crossing',
        'Destination Approach Road',
      ]
      const newCheckpoint = checkpoints[Math.floor(Math.random() * checkpoints.length)]
      const newLoc = `${newCheckpoint} (Near ${trip.destination})`

      await api.admin.updateLocation(trip.booking_id, {
        current_location: newLoc,
        distance_travelled_km: nextKm,
        speed_kmh: nextSpeed,
        fuel_or_battery_level: nextBattery,
        current_lat: trip.current_lat + (Math.random() - 0.5) * 0.02,
        current_lng: trip.current_lng + (Math.random() - 0.5) * 0.02,
        add_checkpoint: newCheckpoint,
      })
      loadData()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSimulatingId(null)
    }
  }

  return (
    <div className="shell py-8">
      <AdminNav />
      <PageHeader
        title="Car Locations & Trip Explorer"
        subtitle="Monitor live fleet locations, real-time telemetry, and see exactly where customers traveled with each vehicle."
      />

      {error && <ErrorNote message={error} />}

      {/* Summary Stats Row */}
      {data && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card p-5 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-950/20 via-ink-900 to-ink-950">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">On Road Now</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="mt-2 font-display text-3xl text-white">{data.summary.active_on_road}</p>
            <p className="mt-1 text-xs text-slate-400">Active driving trips</p>
          </div>

          <div className="card p-5 border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-950/20 via-ink-900 to-ink-950">
            <span className="text-xs font-medium text-cyan-400">Destinations Visited</span>
            <p className="mt-2 font-display text-3xl text-white">{data.summary.unique_destinations}</p>
            <p className="mt-1 text-xs text-slate-400">Cities & tourist spots</p>
          </div>

          <div className="card p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-950/20 via-ink-900 to-ink-950">
            <span className="text-xs font-medium text-amber-400">Distance Covered</span>
            <p className="mt-2 font-display text-3xl text-white">{data.summary.total_distance_km.toLocaleString()} km</p>
            <p className="mt-1 text-xs text-slate-400">Logged on current fleet trips</p>
          </div>

          <div className="card p-5 border-l-4 border-l-signal bg-gradient-to-br from-indigo-950/20 via-ink-900 to-ink-950">
            <span className="text-xs font-medium text-signal">Total Monitored Trips</span>
            <p className="mt-2 font-display text-3xl text-white">{data.summary.total_trips}</p>
            <p className="mt-1 text-xs text-slate-400">Recorded trip logs</p>
          </div>
        </div>
      )}

      {loading || !data ? (
        <Spinner label="Loading live fleet locations…" />
      ) : (
        <div className="space-y-8">
          {/* Real GPS Live Vehicle Map with Route Polylines and Telemetry */}
          <LiveVehicleMap
            trips={data.trips}
            selectedTrip={selectedTrip}
            onSelectTrip={setSelectedTrip}
            onSimulatePing={handleSimulatePing}
            simulatingId={simulatingId}
          />

          {/* "Where People Went" Complete Trip Logs Table */}
          <div className="card p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-medium text-white">Where People Went — Full Trip History</h3>
                <p className="text-xs text-slate-400">
                  Detailed itinerary, destination routes, and checkpoint breadcrumbs traveled by renters
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Search destination, car, or customer…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="field text-xs py-1.5 px-3 w-64"
                />

                <div className="flex gap-1 bg-ink-900 p-1 rounded-lg border border-white/10">
                  {(['all', 'active', 'completed', 'confirmed'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={`px-3 py-1 text-xs rounded-md capitalize transition ${
                        filter === tab ? 'bg-signal text-black font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab === 'all' ? 'All Trips' : tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredTrips.length === 0 ? (
              <Empty
                title="No matching trips found"
                body="Try adjusting your filter or search query to find relevant car journeys."
              />
            ) : (
              <div className="grid gap-4">
                {filteredTrips.map(trip => {
                  const isSelected = selectedTrip?.booking_id === trip.booking_id
                  return (
                    <div
                      key={trip.booking_id}
                      onClick={() => setSelectedTrip(trip)}
                      className={`p-5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-signal/80 bg-slate-900/90 shadow-lg'
                          : 'border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="grid gap-4 lg:grid-cols-[200px_1fr_220px] items-center">
                        {/* Car and Customer */}
                        <div className="flex items-center gap-3">
                          <img
                            src={trip.car.image_url}
                            alt={trip.car.model}
                            className="h-16 w-24 object-contain rounded bg-black/40 p-1"
                          />
                          <div>
                            <p className="font-semibold text-white leading-tight">
                              {trip.car.brand} {trip.car.model}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{trip.customer.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{trip.booking_reference}</p>
                          </div>
                        </div>

                        {/* Where They Went: Destination & Breadcrumbs */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                              <img src="/location-icon-white.png" className="w-3.5 h-3.5 object-contain" alt="Destination" /> Destination: {trip.destination}
                            </span>
                            <span className="text-xs text-slate-400">
                              Dates: {trip.pickup_date} to {trip.return_date}
                            </span>
                          </div>

                          {/* Route checkpoints */}
                          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-500 text-[11px]">Route:</span>
                            {trip.route_stops.length > 0 ? (
                              trip.route_stops.map((stop, i) => (
                                <span key={i} className="flex items-center gap-1 text-[11px]">
                                  <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-200">
                                    {stop}
                                  </span>
                                  {i < trip.route_stops.length - 1 && (
                                    <span className="text-slate-500">→</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400">{trip.trip_route || 'Direct route'}</span>
                            )}
                          </div>
                        </div>

                        {/* Live Location & Telemetry Badge */}
                        <div className="space-y-1.5 text-right lg:border-l lg:border-white/10 lg:pl-5">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={`pill text-[11px] font-semibold ${
                                trip.booking_status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : trip.booking_status === 'completed'
                                  ? 'bg-slate-700/40 text-slate-300'
                                  : 'bg-cyan-500/20 text-cyan-300'
                              }`}
                            >
                              {trip.booking_status === 'active' ? '● On Road' : trip.booking_status}
                            </span>
                          </div>
                          <p className="text-xs text-white font-medium truncate" title={trip.current_location}>
                            {trip.current_location}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {trip.distance_travelled_km} km covered · {trip.speed_kmh} km/h · {trip.fuel_or_battery_level}% {trip.car.fuel_type === 'Electric' ? 'battery' : 'fuel'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
