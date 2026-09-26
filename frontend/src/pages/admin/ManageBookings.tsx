import { useState } from 'react'
import { ErrorNote, PageHeader, Spinner, StatusPill } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { api, rupees } from '../../services/api'
import type { BookingStatus } from '../../types'
import AdminNav from './AdminNav'

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'active', 'completed', 'cancelled']

export default function ManageBookings() {
  const [filter, setFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bookings = useAsync(
    () => api.admin.bookings({ booking_status: filter || undefined, q: search || undefined }),
    [filter, search])

  const change = async (id: number, status: string) => {
    setError(null)
    try { await api.admin.setBookingStatus(id, status); bookings.reload() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="shell py-10">
      <PageHeader title="Bookings" subtitle="Confirm, activate, close out or cancel any trip." />
      <AdminNav />

      <div className="mb-6 flex flex-wrap gap-3">
        <select className="field max-w-[200px]" value={filter}
          onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="field max-w-[240px]" placeholder="Search by reference"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      {bookings.loading ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-ink-600 text-left text-xs text-slate-500">
              <tr>
                <th className="p-4">Reference</th><th className="p-4">Customer</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Destination & Location</th>
                <th className="p-4">Total</th>
                <th className="p-4">Payment</th><th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.data?.items.map(b => (
                <tr key={b.id} className="border-b border-ink-600/60 last:border-0">
                  <td className="p-4 font-mono text-xs text-signal">{b.booking_reference}</td>
                  <td className="p-4">
                    <p className="text-white">{b.customer_name}</p>
                    <p className="text-xs text-slate-500">{b.customer_email}</p>
                  </td>
                  <td className="p-4 text-slate-400">
                    {b.pickup_date} → {b.return_date}
                    <span className="block text-xs text-slate-600">{b.rental_days} days</span>
                  </td>
                  <td className="p-4">
                    <p className="text-white font-medium flex items-center gap-1.5 text-xs">
                      <img src="/location-icon-white.png" className="w-3.5 h-3.5 object-contain" alt="Destination" /> {b.destination || b.return_location}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Current: {b.current_location || `${b.pickup_location} Hub`}
                    </p>
                  </td>
                  <td className="p-4 text-slate-200">{rupees(b.total_amount)}</td>
                  <td className="p-4"><StatusPill status={b.payment_status} /></td>
                  <td className="p-4">
                    <select value={b.booking_status} onChange={e => change(b.id, e.target.value)}
                      className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-1 text-xs">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.data?.items.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">No bookings match that.</p>
          )}
        </div>
      )}
    </div>
  )
}
