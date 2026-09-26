import { Link } from 'react-router-dom'
import { ErrorNote, PageHeader, Spinner, Stat, StatusPill } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { api, rupees } from '../../services/api'
import AdminNav from './AdminNav'

export default function AdminDashboard() {
  const stats = useAsync(() => api.admin.dashboard(), [])
  const recentBookings = useAsync(() => api.admin.bookings(), [])

  return (
    <div className="shell py-10">
      <PageHeader
        title="Fleet Overview & Operations"
        subtitle="Live metrics, financial performance, and fleet management controls."
      />
      <AdminNav />

      {stats.error && <ErrorNote message={stats.error} onRetry={stats.reload} />}

      {stats.loading ? (
        <Spinner label="Loading operations dashboard…" />
      ) : stats.data && (
        <div className="space-y-10">
          {/* Top Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Cars in fleet"
              value={stats.data.total_cars}
              sub={`${stats.data.cars_on_road} out on rent today`}
            />
            <Stat label="Free today" value={stats.data.available_cars} />
            <Stat label="Registered Users" value={stats.data.total_users} />
            <Stat
              label="Revenue collected"
              value={rupees(stats.data.total_revenue)}
              sub="Deposits excluded"
            />
          </div>

          {/* Quick Management Hub Cards */}
          <div>
            <h2 className="mb-4 text-lg font-medium text-white flex items-center gap-2">
              <span>⚡</span> Quick Management Hub
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/tracking"
                className="card p-5 border border-white/10 hover:border-emerald-500/50 hover:bg-slate-900/60 transition group bg-gradient-to-br from-emerald-950/20 via-ink-900 to-ink-950"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🛰️</span>
                  <span className="pill text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                    {stats.data.cars_on_road} On Road
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-white group-hover:text-emerald-400 transition text-base">
                  Car Locations & Live GPS
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Track moving vehicles, destinations visited & live telemetry
                </p>
                <span className="mt-4 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  Open GPS Tracker ➔
                </span>
              </Link>

              <Link
                to="/admin/cars"
                className="card p-5 border border-white/10 hover:border-cyan-500/50 hover:bg-slate-900/60 transition group bg-gradient-to-br from-cyan-950/20 via-ink-900 to-ink-950"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                    <img src="/car-icon-white.png" className="w-6 h-6 object-contain" alt="Fleet" />
                  </div>
                  <span className="pill text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold">
                    {stats.data.total_cars} Cars
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-white group-hover:text-cyan-400 transition text-base">
                  Fleet Inventory
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Add, edit prices, update specs or manage electric & ICE cars
                </p>
                <span className="mt-4 text-xs text-cyan-400 font-semibold flex items-center gap-1">
                  Manage Fleet ➔
                </span>
              </Link>

              <Link
                to="/admin/bookings"
                className="card p-5 border border-white/10 hover:border-amber-500/50 hover:bg-slate-900/60 transition group bg-gradient-to-br from-amber-950/20 via-ink-900 to-ink-950"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                    <img src="/booking-icon-white.png" className="w-6 h-6 object-contain" alt="Bookings" />
                  </div>
                  <span className="pill text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                    {stats.data.total_bookings} Bookings
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-white group-hover:text-amber-400 transition text-base">
                  All Bookings & Trips
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Confirm reservations, check payments, and review trip requests
                </p>
                <span className="mt-4 text-xs text-amber-400 font-semibold flex items-center gap-1">
                  View Bookings ➔
                </span>
              </Link>

              <Link
                to="/admin/users"
                className="card p-5 border border-white/10 hover:border-purple-500/50 hover:bg-slate-900/60 transition group bg-gradient-to-br from-purple-950/20 via-ink-900 to-ink-950"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                    <img src="/user-icon-white.png" className="w-6 h-6 object-contain" alt="Users" />
                  </div>
                  <span className="pill text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/40 font-bold">
                    {stats.data.total_users} Users
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-white group-hover:text-purple-400 transition text-base">
                  User Accounts
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  View registered customers, booking counts & manage roles
                </p>
                <span className="mt-4 text-xs text-purple-400 font-semibold flex items-center gap-1">
                  Manage Accounts ➔
                </span>
              </Link>
            </div>
          </div>

          {/* Bookings Status Strip */}
          <div>
            <h2 className="mb-4 text-lg font-medium text-white">Bookings by Status</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Pending" value={stats.data.pending_bookings} />
              <Stat label="Confirmed" value={stats.data.confirmed_bookings} />
              <Stat label="Active (On Road)" value={stats.data.active_bookings} />
              <Stat label="Completed" value={stats.data.completed_bookings} />
              <Stat label="Cancelled" value={stats.data.cancelled_bookings} />
            </div>
          </div>

          {/* Revenue Trend Chart */}
          {stats.data.revenue_trend.length > 0 && (
            <section className="card p-6 border border-white/10 bg-slate-950/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Rental Revenue (Last 30 Days)</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Aggregated daily booking volume and value by pickup date
                  </p>
                </div>
                <span className="pill text-xs bg-signal text-black font-bold">
                  Total: {rupees(stats.data.total_revenue)}
                </span>
              </div>
              <Sparkline data={stats.data.revenue_trend} />
            </section>
          )}

          {/* Recent Trips & Bookings Preview Table */}
          <section className="card p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Recent Customer Trips & Bookings</h2>
                <p className="text-xs text-slate-400">
                  Latest activity showing reserved cars, destinations, and live locations
                </p>
              </div>
              <Link to="/admin/bookings" className="btn-quiet text-xs">
                View All {stats.data.total_bookings} Bookings ➔
              </Link>
            </div>

            {recentBookings.loading ? (
              <Spinner label="Loading recent trips…" />
            ) : recentBookings.data && recentBookings.data.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-slate-400">
                    <tr>
                      <th className="py-3 px-3">Vehicle</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Destination / Where They Went</th>
                      <th className="py-3 px-3">Dates</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Payment</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentBookings.data.items.slice(0, 6).map(b => (
                      <tr key={b.id} className="hover:bg-white/5 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {b.car && (
                              <img
                                src={b.car.image_url}
                                alt={b.car.model}
                                className="h-9 w-14 object-contain rounded bg-black/40 p-0.5"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-white">
                                {b.car ? `${b.car.brand} ${b.car.model}` : `Car #${b.car_id}`}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">{b.booking_reference}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-white font-medium">{b.customer_name || 'Customer'}</p>
                          <p className="text-[10px] text-slate-400">{b.customer_email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <img src="/location-icon-white.png" className="w-3.5 h-3.5 object-contain" alt="Destination" /> {b.destination || b.return_location}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Current: {b.current_location || `${b.pickup_location} Hub`}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {b.pickup_date} → {b.return_date}
                          <span className="block text-[10px] text-slate-500">{b.rental_days} days</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {rupees(b.total_amount)}
                        </td>
                        <td className="py-3 px-3">
                          <StatusPill status={b.payment_status} />
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`pill text-[10px] font-bold ${
                              b.booking_status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : b.booking_status === 'completed'
                                ? 'bg-slate-700/40 text-slate-300'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {b.booking_status === 'active' ? '● On Road' : b.booking_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to="/admin/tracking"
                            className="pill text-[11px] bg-white/10 hover:bg-signal hover:text-black font-semibold transition"
                          >
                            Track Live ➔
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No bookings recorded yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function Sparkline({ data }: { data: { date: string; revenue: number; bookings?: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div className="mt-6 flex h-52 items-end gap-3 sm:gap-6 overflow-x-auto pt-8 pb-3 px-2">
      {data.map(d => {
        const heightPct = Math.max(Math.round((d.revenue / max) * 100), 12)
        return (
          <div
            key={d.date}
            className="group flex h-full min-w-[50px] flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-[11px] font-bold text-signal opacity-80 group-hover:opacity-100 transition whitespace-nowrap">
              {rupees(d.revenue)}
            </span>
            <div
              className="w-full max-w-[52px] rounded-t-lg bg-gradient-to-t from-signal/40 via-signal/80 to-signal transition duration-300 group-hover:from-signal/60 group-hover:to-signal shadow-lg shadow-signal/20 group-hover:scale-105"
              style={{ height: `${heightPct}%` }}
              title={`${d.date}: ${rupees(d.revenue)} (${d.bookings ?? 1} bookings)`}
            />
            <span className="text-xs font-mono text-slate-400 font-semibold">{d.date.slice(5)}</span>
          </div>
        )
      })}
    </div>
  )
}
