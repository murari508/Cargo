import { useState } from 'react'
import { Link } from 'react-router-dom'
import CarCard from '../components/CarCard'
import { Empty, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { api, rupees } from '../services/api'
import DashboardMotionBackground, { DashboardTheme } from '../components/DashboardMotionBackground'
import ThemeCursor from '../components/ThemeCursor'

export default function Dashboard() {
  const { user } = useAuth()
  const stats = useAsync(() => api.users.dashboard(), [])
  const saved = useAsync(() => api.users.savedCars(), [])

  // Time-aware default
  const defaultTheme: DashboardTheme = (() => {
    const hour = new Date().getHours()
    return hour >= 5 && hour < 18 ? 'morning' : 'night'
  })()

  const [theme, setTheme] = useState<DashboardTheme>(defaultTheme)
  const isMorning = theme === 'morning'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name.split(' ')[0] ?? 'Explorer'

  return (
    <div className="relative min-h-screen pb-20">
      {/* Interactive Morning / Night Custom Cursor */}
      <ThemeCursor theme={theme} />

      {/* Unique Cockpit Telemetry Background */}
      <DashboardMotionBackground theme={theme} />

      <div className="shell pt-8">
        {/* Top Cockpit Telemetry Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`pill text-xs font-semibold tracking-wider transition-all duration-500 ${
                  isMorning
                    ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                }`}
              >
                {isMorning ? '☀️ Sunrise Drive Mode' : '🌙 Midnight Cruise Mode'}
              </span>
              <span className="text-xs text-slate-400">· Telemetry Active</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {isMorning
                ? 'The sunrise highway is calling. Your keys are waiting.'
                : 'Clear roads, quiet cities. Enjoy your midnight journey.'}
            </p>
          </div>

          {/* Morning / Night Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-2xl shadow-xl">
              <button
                type="button"
                onClick={() => setTheme('morning')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                  isMorning
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-ink-900 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ☀️ Morning
              </button>
              <button
                type="button"
                onClick={() => setTheme('night')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                  !isMorning
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.6)] scale-105'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌙 Night
              </button>
            </div>

            <Link
              to="/cars"
              className={`btn px-5 py-2 text-sm font-semibold transition-all duration-300 ${
                isMorning
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-ink-900 hover:from-amber-300 hover:to-orange-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
              }`}
            >
              Book a car
            </Link>
          </div>
        </div>

        {/* Cockpit Quick Actions */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            to="/cars"
            className="card flex items-center gap-3 border-white/10 bg-ink-900/70 p-3.5 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/5"
          >
            <div className="p-1 rounded-lg bg-white/10 flex items-center justify-center">
              <img src="/car-icon-white.png" className="w-5 h-5 object-contain" alt="Find Cars" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Find Cars</div>
              <div className="text-xs text-slate-400">Explore fleet</div>
            </div>
          </Link>
          <Link
            to="/trip-planner"
            className="card flex items-center gap-3 border-white/10 bg-ink-900/70 p-3.5 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/5"
          >
            <span className="text-xl">🗺️</span>
            <div>
              <div className="text-sm font-semibold text-white">AI Planner</div>
              <div className="text-xs text-slate-400">Smart itineraries</div>
            </div>
          </Link>
          <Link
            to="/bookings"
            className="card flex items-center gap-3 border-white/10 bg-ink-900/70 p-3.5 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/5"
          >
            <span className="text-xl">📑</span>
            <div>
              <div className="text-sm font-semibold text-white">Bookings</div>
              <div className="text-xs text-slate-400">Active & history</div>
            </div>
          </Link>
          <Link
            to="/profile"
            className="card flex items-center gap-3 border-white/10 bg-ink-900/70 p-3.5 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/5"
          >
            <span className="text-xl">👤</span>
            <div>
              <div className="text-sm font-semibold text-white">Profile</div>
              <div className="text-xs text-slate-400">Preferences & KYC</div>
            </div>
          </Link>
        </div>

        {/* Telemetry Stats Grid */}
        {stats.loading ? (
          <Spinner />
        ) : (
          stats.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  className={`card rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-500 ${
                    isMorning
                      ? 'border-amber-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)]'
                      : 'border-cyan-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.15)]'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Upcoming trips
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {stats.data.upcoming_bookings}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Ready to drive</div>
                </div>

                <div
                  className={`card rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-500 ${
                    isMorning
                      ? 'border-amber-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)]'
                      : 'border-cyan-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.15)]'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total bookings
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {stats.data.total_bookings}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Lifetime journeys</div>
                </div>

                <div
                  className={`card rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-500 ${
                    isMorning
                      ? 'border-amber-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)]'
                      : 'border-cyan-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.15)]'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Spent with CarGo
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {rupees(stats.data.total_spend)}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Deposits excluded</div>
                </div>

                <div
                  className={`card rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-500 ${
                    isMorning
                      ? 'border-amber-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)]'
                      : 'border-cyan-500/25 bg-ink-900/75 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.15)]'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Saved fleet
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {stats.data.saved_cars}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Bookmarked vehicles</div>
                </div>
              </div>

              {/* Next Trip Hero Banner */}
              {stats.data.next_trip && (
                <div
                  className={`card mt-8 flex flex-wrap items-center justify-between gap-6 rounded-2xl border p-7 backdrop-blur-2xl transition-all duration-500 ${
                    isMorning
                      ? 'border-amber-500/35 bg-ink-900/80 shadow-[0_20px_50px_rgba(245,158,11,0.15)]'
                      : 'border-cyan-500/35 bg-ink-900/80 shadow-[0_20px_50px_rgba(56,189,248,0.15)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-signal">
                        Next Confirmed Expedition
                      </p>
                    </div>
                    <h2 className="mt-2 text-2xl font-bold text-white">
                      {stats.data.next_trip.car}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-300 flex items-center flex-wrap gap-1.5">
                      <span>📅 {stats.data.next_trip.pickup_date}</span>
                      <span className="mx-1 text-slate-500">·</span>
                      <img src="/location-icon-white.png" className="w-3.5 h-3.5 object-contain inline-block" alt="Location" />
                      <span>{stats.data.next_trip.pickup_location}</span>
                      <span className="mx-2 text-slate-500">|</span>
                      Ref: <span className="font-mono text-signal">{stats.data.next_trip.booking_reference}</span>
                    </p>
                  </div>
                  <Link to="/bookings" className="btn-ghost px-5 py-2.5">
                    View Trip Agreement & Key
                  </Link>
                </div>
              )}
            </>
          )
        )}

        {/* Saved For Later Section */}
        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Saved for later</h2>
              <p className="text-sm text-slate-400">Vehicles you have bookmarked for upcoming road trips</p>
            </div>
            <Link to="/cars" className="btn-ghost text-xs">
              View full fleet →
            </Link>
          </div>

          {saved.loading ? (
            <Spinner />
          ) : (saved.data?.length ?? 0) === 0 ? (
            <div className="card rounded-2xl border border-white/10 bg-ink-900/60 p-8 backdrop-blur-xl">
              <Empty
                title="Nothing saved yet"
                body="Tap 'Save for later' on any car in the fleet and it will appear in your cockpit."
                action={<Link to="/cars" className="btn-ghost">Browse cars</Link>}
              />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {saved.data!.map(c => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

