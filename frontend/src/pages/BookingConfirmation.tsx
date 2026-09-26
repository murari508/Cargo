import { Link, useParams } from 'react-router-dom'
import { ErrorNote, Spinner, StatusPill } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { api, rupees } from '../services/api'

export default function BookingConfirmation() {
  const { bookingId } = useParams()
  const booking = useAsync(() => api.bookings.one(Number(bookingId)), [bookingId])

  if (booking.loading) return <div className="shell"><Spinner /></div>
  if (!booking.data) return <div className="shell py-10"><ErrorNote message="Booking not found" /></div>
  const b = booking.data

  return (
    <div className="shell max-w-2xl py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-road/15 text-road">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <h1 className="mt-6 text-3xl sm:text-4xl">You're booked</h1>
      <p className="mt-3 text-slate-400">
        Reference <span className="font-mono text-signal">{b.booking_reference}</span>.
        We've held {b.car?.brand} {b.car?.model} for you.
      </p>

      <div className="card mt-10 space-y-4 p-6 text-left">
        <div className="flex items-center justify-between">
          <StatusPill status={b.booking_status} />
          <StatusPill status={b.payment_status} />
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <Item k="Pickup" v={`${b.pickup_date} at ${b.pickup_time.slice(0, 5)}`} />
          <Item k="Return" v={`${b.return_date} at ${b.return_time.slice(0, 5)}`} />
          <Item k="From" v={b.pickup_location} />
          <Item k="To" v={b.return_location} />
          <Item k="Rental days" v={String(b.rental_days)} />
          <Item k="Total paid" v={rupees(b.total_amount)} />
        </dl>
        <p className="border-t border-ink-600 pt-4 text-xs text-slate-500">
          Bring your driving licence and a photo ID. The {rupees(b.security_deposit)} deposit
          comes back within 7 days of return.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/bookings" className="btn-primary">View my bookings</Link>
        <Link to="/cars" className="btn-ghost">Book another car</Link>
      </div>
    </div>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs text-slate-500">{k}</dt>
    <dd className="mt-1 text-slate-200">{v}</dd></div>
}
