import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorNote, PageHeader, Spinner, StatusPill } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { api, rupees } from '../services/api'
import type { BookingStatus } from '../types'

const TABS: (BookingStatus | 'all')[] = ['all', 'pending', 'confirmed', 'active',
                                          'completed', 'cancelled']

export default function MyBookings() {
  const [tab, setTab] = useState<BookingStatus | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  const list = useAsync(() => api.bookings.mine(tab === 'all' ? undefined : tab), [tab])

  const cancel = async (id: number) => {
    setError(null)
    try {
      await api.bookings.cancel(id)
      list.reload()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="shell py-10">
      <PageHeader title="My bookings" subtitle="Every trip you've booked with CarGo." />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
              tab === t ? 'bg-signal text-ink-900 font-semibold'
                        : 'border border-white/10 text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      {list.loading ? <Spinner /> : (list.data?.items.length ?? 0) === 0 ? (
        <Empty title="No bookings here"
          body={tab === 'all' ? 'Once you book a car it shows up on this page.'
                              : `You have no ${tab} bookings.`}
          action={<Link to="/cars" className="btn-primary">Find a car</Link>} />
      ) : (
        <div className="space-y-4">
          {list.data!.items.map(b => {
            const cancellable = ['pending', 'confirmed'].includes(b.booking_status)
            return (
              <article key={b.id} className="card flex flex-col gap-5 p-5 sm:flex-row">
                <img src={b.car?.image_url} alt=""
                  className="h-32 w-full rounded-xl object-cover sm:w-48" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg">{b.car?.brand} {b.car?.model}</h2>
                      <p className="mt-1 font-mono text-xs text-slate-500">{b.booking_reference}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusPill status={b.booking_status} />
                      <StatusPill status={b.payment_status} />
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Item k="Pickup" v={`${b.pickup_date} ${b.pickup_time.slice(0, 5)}`} />
                    <Item k="Return" v={`${b.return_date} ${b.return_time.slice(0, 5)}`} />
                    <Item k="From" v={b.pickup_location} />
                    <Item k="Total" v={rupees(b.total_amount)} />
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {b.payment_status === 'unpaid' && b.booking_status !== 'cancelled' && (
                      <Link to={`/payment/${b.id}`} className="btn-primary">Complete payment</Link>
                    )}
                    <Link to={`/confirmation/${b.id}`} className="btn-ghost">Details</Link>
                    {cancellable && (
                      <button onClick={() => cancel(b.id)} className="btn-quiet">Cancel booking</button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs text-slate-500">{k}</dt>
    <dd className="mt-0.5 text-slate-200">{v}</dd></div>
}
