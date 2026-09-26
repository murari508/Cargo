import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FleetTrip } from '../types'

interface LiveVehicleMapProps {
  trips: FleetTrip[]
  selectedTrip: FleetTrip | null
  onSelectTrip: (trip: FleetTrip) => void
  onSimulatePing: (trip: FleetTrip) => void
  simulatingId: number | null
}

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    name: 'Dark Telemetry',
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    name: 'Street Roads',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    name: 'Satellite',
  },
}

// Route waypoint coordinates for realistic polylines
const ROUTE_COORDINATES: Record<string, [number, number][]> = {
  'srisailam': [
    [17.4401, 78.3489], // Hyderabad Gachibowli
    [17.2403, 78.4294], // Shamshabad ORR
    [16.8524, 78.5831], // Kadthal
    [16.4820, 78.7120], // Dindi Reservoir
    [16.1524, 78.8231], // Srisailam Ghats
    [16.0734, 78.8687], // Srisailam Dam
  ],
  'lonavala': [
    [19.1136, 72.8697], // Mumbai Andheri
    [19.0330, 73.0297], // Navi Mumbai
    [18.8821, 73.2384], // Khalapur Toll
    [18.7612, 73.3768], // Khandala Ghat
    [18.7557, 73.4091], // Lonavala Tiger Point
  ],
  'coorg': [
    [12.9352, 77.6245], // Bengaluru Koramangala
    [12.7523, 77.4120], // NICE Road
    [12.5218, 76.8951], // Mandya
    [12.3082, 76.2911], // Hunsur Junction
    [12.4244, 75.7382], // Madikeri Coorg
  ],
  'goa': [
    [15.4909, 73.8278], // Panaji
    [15.5009, 73.9116], // Old Goa
    [15.5412, 73.7634], // Calangute
    [15.5553, 73.7516], // Baga Beach
  ],
  'tirupati': [
    [13.0067, 80.2025], // Chennai Guindy
    [13.1432, 79.9082], // Tiruvallur
    [13.2514, 79.6105], // Tiruttani
    [13.6288, 79.4192], // Tirupati Alipiri
  ],
}

function getRouteForTrip(trip: FleetTrip): [number, number][] {
  const destLower = (trip.destination || '').toLowerCase()
  for (const [key, coords] of Object.entries(ROUTE_COORDINATES)) {
    if (destLower.includes(key)) return coords
  }
  // Fallback: straight line with midpoints
  const start: [number, number] = [trip.current_lat || 17.3850, trip.current_lng || 78.4867]
  return [start]
}

export default function LiveVehicleMap({
  trips,
  selectedTrip,
  onSelectTrip,
  onSimulatePing,
  simulatingId,
}: LiveVehicleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<number, L.Marker>>({})
  const routePolylineRef = useRef<L.Polyline | null>(null)
  const waypointMarkersRef = useRef<L.Marker[]>([])
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  const [activeTile, setActiveTile] = useState<'dark' | 'streets' | 'satellite'>('dark')
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'ev'>('all')

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Center of southern/central India
    const map = L.map(mapContainerRef.current, {
      center: [16.5, 76.5],
      zoom: 6,
      zoomControl: false,
    })

    // Custom top-right zoom control
    L.control.zoom({ position: 'topright' }).addTo(map)

    const layerConfig = TILE_LAYERS[activeTile]
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 18,
    }).addTo(map)

    tileLayerRef.current = tileLayer
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Handle tile switch
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return
    const map = mapInstanceRef.current
    map.removeLayer(tileLayerRef.current)

    const layerConfig = TILE_LAYERS[activeTile]
    const newLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 18,
    }).addTo(map)

    tileLayerRef.current = newLayer
  }, [activeTile])

  // Filtered trips for map markers
  const displayedTrips = trips.filter(t => {
    if (filterMode === 'active') return t.booking_status === 'active'
    if (filterMode === 'ev') return t.car.fuel_type === 'Electric'
    return true
  })

  // Render vehicle markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m))
    markersRef.current = {}

    displayedTrips.forEach(trip => {
      const lat = trip.current_lat || 17.3850
      const lng = trip.current_lng || 78.4867
      const isSelected = selectedTrip?.booking_id === trip.booking_id
      const isActive = trip.booking_status === 'active'
      const isEV = trip.car.fuel_type === 'Electric'

      // Custom animated vehicle HTML marker
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${isActive ? '<span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-60"></span>' : ''}
          <div class="relative flex items-center justify-center h-9 w-9 rounded-full border-2 shadow-2xl transition-transform transform group-hover:scale-125 ${
            isSelected
              ? 'ring-4 ring-signal bg-signal border-white scale-125 text-black'
              : isActive
              ? 'bg-emerald-600 border-emerald-300 text-white'
              : trip.booking_status === 'completed'
              ? 'bg-slate-700 border-slate-400 text-slate-200'
              : 'bg-cyan-600 border-cyan-300 text-white'
          }">
            ${
              isEV
                ? '<span class="text-sm">⚡</span>'
                : `<img src="${isSelected ? '/car-icon.png' : '/car-icon-white.png'}" class="w-5 h-5 object-contain" alt="Car" />`
            }
          </div>
          <!-- Label Tooltip -->
          <div class="absolute -top-7 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold shadow-lg pointer-events-none transition-all ${
            isSelected
              ? 'bg-signal text-black scale-105'
              : 'bg-black/85 text-slate-100 border border-white/20'
          }">
            ${trip.car.brand} ${trip.car.model} ${isActive ? `· ${trip.speed_kmh} km/h` : ''}
          </div>
        </div>
      `

      const customIcon = L.divIcon({
        className: 'vehicle-marker-icon',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)

      // Popup content
      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; color: #0f172a; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 13px;">${trip.car.brand} ${trip.car.model}</strong>
            <span style="font-size: 10px; font-weight: bold; background: ${isActive ? '#10b981' : '#64748b'}; color: white; padding: 2px 6px; border-radius: 9999px;">
              ${isActive ? 'LIVE ON ROAD' : trip.booking_status.toUpperCase()}
            </span>
          </div>
          <div style="margin-bottom: 6px; font-size: 11px; color: #475569;">
            <strong>Customer:</strong> ${trip.customer.name} (${trip.customer.phone})
          </div>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 6px; margin-bottom: 6px;">
            <div style="font-size: 11px; color: #047857; font-weight: bold; display: flex; align-items: center; gap: 4px;">
              <img src="/location-icon.png" style="width: 13px; height: 13px; object-fit: contain; vertical-align: middle;" alt="Destination" /> Destination: ${trip.destination}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              Current: ${trip.current_location}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; text-align: center; font-size: 11px;">
            <div style="background: #e2e8f0; padding: 4px; border-radius: 4px;">
              <span style="display: block; font-size: 9px; color: #64748b;">SPEED</span>
              <strong>${trip.speed_kmh} km/h</strong>
            </div>
            <div style="background: #e2e8f0; padding: 4px; border-radius: 4px;">
              <span style="display: block; font-size: 9px; color: #64748b;">DISTANCE</span>
              <strong>${trip.distance_travelled_km} km</strong>
            </div>
            <div style="background: #e2e8f0; padding: 4px; border-radius: 4px;">
              <span style="display: block; font-size: 9px; color: #64748b;">${isEV ? 'BATTERY' : 'FUEL'}</span>
              <strong>${trip.fuel_or_battery_level}%</strong>
            </div>
          </div>
        </div>
      `
      marker.bindPopup(popupContent)

      marker.on('click', () => {
        onSelectTrip(trip)
      })

      markersRef.current[trip.booking_id] = marker
    })
  }, [displayedTrips, selectedTrip])

  // Draw Route Polyline & Waypoints for Selected Trip
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !selectedTrip) return

    // Clean up previous route polyline and waypoint pins
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current)
      routePolylineRef.current = null
    }
    waypointMarkersRef.current.forEach(m => map.removeLayer(m))
    waypointMarkersRef.current = []

    const routeCoords = getRouteForTrip(selectedTrip)
    if (routeCoords.length > 1) {
      // Glow background line
      const polyline = L.polyline(routeCoords, {
        color: selectedTrip.booking_status === 'active' ? '#10b981' : '#38bdf8',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map)

      routePolylineRef.current = polyline

      // Add Start (Hub) & End (Destination) pins
      const startCoord = routeCoords[0]
      const endCoord = routeCoords[routeCoords.length - 1]

      const startIcon = L.divIcon({
        className: 'hub-pin',
        html: `<div class="h-4 w-4 rounded-full bg-cyan-400 ring-4 ring-cyan-400/40 shadow-lg"></div>`,
        iconSize: [16, 16],
      })
      const endIcon = L.divIcon({
        className: 'dest-pin',
        html: `<div class="h-6 w-6 rounded-full bg-amber-400 ring-4 ring-amber-400/40 shadow-lg flex items-center justify-center">
          <img src="/location-icon.png" class="w-3.5 h-3.5 object-contain" alt="Destination" />
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const startMarker = L.marker(startCoord, { icon: startIcon }).addTo(map)
      startMarker.bindTooltip(`Pickup: ${selectedTrip.pickup_location} Hub`, { permanent: false })

      const endMarker = L.marker(endCoord, { icon: endIcon }).addTo(map)
      endMarker.bindTooltip(`Destination: ${selectedTrip.destination}`, { permanent: false })

      waypointMarkersRef.current.push(startMarker, endMarker)

      // Pan to vehicle
      const currentLat = selectedTrip.current_lat || startCoord[0]
      const currentLng = selectedTrip.current_lng || startCoord[1]
      map.flyTo([currentLat, currentLng], Math.max(map.getZoom(), 8), {
        duration: 1.2,
      })
    }
  }, [selectedTrip])

  // Fit all markers in view
  const handleFitAll = () => {
    const map = mapInstanceRef.current
    if (!map || displayedTrips.length === 0) return
    const latLngs = displayedTrips.map(t => [t.current_lat || 17.3850, t.current_lng || 78.4867] as [number, number])
    const bounds = L.latLngBounds(latLngs)
    map.fitBounds(bounds, { padding: [50, 50] })
  }

  return (
    <div className="card overflow-hidden border border-white/10 bg-slate-950 flex flex-col">
      {/* Map Header / Telemetry Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/10 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <h3 className="font-semibold text-white text-base">Live Fleet GPS Tracker</h3>
          <span className="text-xs text-slate-400">({displayedTrips.length} vehicles active on radar)</span>
        </div>

        {/* Filter and Map Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex bg-ink-950 p-1 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded transition ${filterMode === 'all' ? 'bg-signal text-black font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('active')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${filterMode === 'active' ? 'bg-emerald-500 text-black font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              <img
                src={filterMode === 'active' ? '/car-icon.png' : '/car-icon-white.png'}
                className="w-3.5 h-3.5 object-contain inline-block"
                alt="Fleet"
              />{' '}
              On Road
            </button>
            <button
              onClick={() => setFilterMode('ev')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${filterMode === 'ev' ? 'bg-cyan-500 text-black font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              <span>⚡</span> EVs Only
            </button>
          </div>

          {/* Layer switcher */}
          <div className="flex bg-ink-950 p-1 rounded-lg border border-white/10 text-xs">
            {(['dark', 'streets', 'satellite'] as const).map(l => (
              <button
                key={l}
                onClick={() => setActiveTile(l)}
                className={`px-2.5 py-1 rounded capitalize transition flex items-center gap-1.5 ${
                  activeTile === l ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {l === 'dark' && (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                )}
                {l === 'streets' && (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" x2="9" y1="3" y2="18" />
                    <line x1="15" x2="15" y1="6" y2="21" />
                  </svg>
                )}
                {l === 'satellite' && (
                  <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10a7.33 7.33 0 0 0 10 10" />
                    <path d="M4 14a3 3 0 0 0 6 6" />
                    <circle cx="5" cy="19" r="1" fill="currentColor" />
                    <rect width="8" height="6" x="12" y="4" rx="1" transform="rotate(45 16 7)" />
                    <path d="m14 10 2 2" />
                    <path d="m18 6 2 2" />
                  </svg>
                )}
                <span>{l}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleFitAll}
            className="pill text-xs bg-ink-800 hover:bg-ink-700 text-slate-200 border border-white/10 transition"
            title="Fit all cars into map view"
          >
            🎯 Fit Fleet
          </button>
        </div>
      </div>

      {/* Real Map Canvas */}
      <div className="relative w-full h-[520px]">
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Selected Vehicle Floating HUD Overlay on Top Left of Map */}
        {selectedTrip && (
          <div className="absolute top-4 left-4 z-10 max-w-sm rounded-xl border border-white/15 bg-slate-950/90 p-4 backdrop-blur-md shadow-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tracking Selected Vehicle
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {selectedTrip.car.brand} {selectedTrip.car.model}
                </h4>
                <p className="text-[11px] text-slate-400">Driver: {selectedTrip.customer.name}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedTrip.booking_status === 'active'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {selectedTrip.booking_status === 'active' ? '● On Road' : selectedTrip.booking_status}
              </span>
            </div>

            {/* Destination Highlight */}
            <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 p-2 text-xs">
              <span className="text-emerald-400 font-semibold block text-[10px]">TRAVELED TO:</span>
              <span className="text-white font-bold">{selectedTrip.destination}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Current checkpoint: {selectedTrip.current_location}
              </span>
            </div>

            {/* Telemetry Stats */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div className="rounded bg-white/5 p-1.5">
                <span className="block text-[9px] text-slate-400">SPEED</span>
                <span className="font-bold text-white text-xs">{selectedTrip.speed_kmh} km/h</span>
              </div>
              <div className="rounded bg-white/5 p-1.5">
                <span className="block text-[9px] text-slate-400">DISTANCE</span>
                <span className="font-bold text-white text-xs">{selectedTrip.distance_travelled_km} km</span>
              </div>
              <div className="rounded bg-white/5 p-1.5">
                <span className="block text-[9px] text-slate-400">{selectedTrip.car.fuel_type === 'Electric' ? 'BATTERY' : 'FUEL'}</span>
                <span className="font-bold text-emerald-400 text-xs">{selectedTrip.fuel_or_battery_level}%</span>
              </div>
            </div>

            {/* GPS coordinates & action */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
              <span className="text-slate-400 font-mono">
                {selectedTrip.current_lat.toFixed(4)}° N, {selectedTrip.current_lng.toFixed(4)}° E
              </span>
              <button
                disabled={simulatingId === selectedTrip.booking_id}
                onClick={() => onSimulatePing(selectedTrip)}
                className="pill bg-signal text-black font-bold px-2 py-0.5 hover:opacity-90 transition disabled:opacity-50"
              >
                {simulatingId === selectedTrip.booking_id ? 'Pinging…' : '📡 Simulate GPS Ping'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-900/60 border-t border-white/5 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm"></span> Moving on Road (Live)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-sm"></span> Regional Hub / Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-slate-500 shadow-sm"></span> Returned / Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-400 shadow-sm"></span> Traveled Destination Pin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-emerald-400 border border-emerald-400 border-dashed"></span> Checkpoint Trail
          </span>
        </div>
        <span>Click any vehicle on the map or table to inspect its live route</span>
      </div>
    </div>
  )
}
