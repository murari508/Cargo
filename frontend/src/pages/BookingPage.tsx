import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Breadcrumb, ErrorNote, PageHeader, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { api, rupees } from '../services/api'
import type { PriceQuote } from '../types'

export default function BookingPage() {
  const { carId } = useParams()
  const id = Number(carId)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const car = useAsync(() => api.cars.one(id), [id])
  const [quote, setQuote] = useState<PriceQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    pickup_date: params.get('pickup_date') ?? '',
    return_date: params.get('return_date') ?? '',
    pickup_time: '10:00',
    return_time: '18:00',
    pickup_location: '',
    return_location: '',
    destination: '',
  })

  useEffect(() => {
    if (car.data && !form.pickup_location) {
      setForm(f => ({ ...f, pickup_location: car.data!.location,
                      return_location: car.data!.location }))
    }
  }, [car.data])

  useEffect(() => {
    if (!form.pickup_date || !form.return_date) return
    api.bookings.quote(id, form.pickup_date, form.return_date)
      .then(setQuote).catch(() => setQuote(null))
  }, [id, form.pickup_date, form.return_date])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const booking = await api.bookings.create({
        car_id: id,
        ...form,
        pickup_time: `${form.pickup_time}:00`,
        return_time: `${form.return_time}:00`,
      })
      navigate(`/payment/${booking.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (car.loading) return <div className="shell"><Spinner /></div>
  if (!car.data) return <div className="shell py-10"><ErrorNote message="Car not found" /></div>

  return (
    <div className="shell py-8">
      <Breadcrumb to={`/cars/${id}`}>← Back to the car</Breadcrumb>
      <PageHeader title="Confirm your trip"
        subtitle="Check the details. Nothing is charged until the next step." />

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={submit} className="card space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pickup date" id="pd">
              <input id="pd" type="date" required className="field" value={form.pickup_date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setForm({ ...form, pickup_date: e.target.value })} />
            </Field>
            <Field label="Return date" id="rd">
              <input id="rd" type="date" required className="field" value={form.return_date}
                min={form.pickup_date}
                onChange={e => setForm({ ...form, return_date: e.target.value })} />
            </Field>
            <Field label="Pickup time" id="pt">
              <input id="pt" type="time" required className="field" value={form.pickup_time}
                onChange={e => setForm({ ...form, pickup_time: e.target.value })} />
            </Field>
            <Field label="Return time" id="rt">
              <input id="rt" type="time" required className="field" value={form.return_time}
                onChange={e => setForm({ ...form, return_time: e.target.value })} />
            </Field>
            <Field label="Pickup location" id="pl">
              <input id="pl" required minLength={2} className="field" value={form.pickup_location}
                onChange={e => setForm({ ...form, pickup_location: e.target.value })} />
            </Field>
            <Field label="Drop location" id="rl">
              <input id="rl" required minLength={2} className="field" value={form.return_location}
                onChange={e => setForm({ ...form, return_location: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Planned Destination / Where are you heading? (Optional)" id="dest">
                <input id="dest" className="field"
                  placeholder="e.g. Srisailam Dam, Goa Baga Beach, Coorg Hills, Lonavala…"
                  value={form.destination}
                  onChange={e => setForm({ ...form, destination: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-ink-600 bg-ink-900/60 p-4 text-sm text-slate-400">
            <p className="text-slate-300">Driver</p>
            <p className="mt-1">{user?.full_name} · {user?.phone} · {user?.email}</p>
            <p className="mt-2 text-xs">Carry your driving licence and one photo ID at pickup.</p>
          </div>

          {error && <ErrorNote message={error} />}

          <button className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Holding your car…' : 'Reserve and continue to payment'}
          </button>
        </form>

        <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <div className="flex gap-4">
            <img src={car.data.image_url} alt="" className="h-20 w-28 rounded-xl object-cover" />
            <div>
              <h2 className="text-lg leading-tight">{car.data.brand} {car.data.model}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {car.data.transmission} · {car.data.seats} seats · {car.data.fuel_type}
              </p>
            </div>
          </div>

          {quote ? (
            <dl className="space-y-2 border-t border-ink-600 pt-4 text-sm">
              <Row k={`${rupees(quote.price_per_day)} × ${quote.rental_days} days`}
                   v={rupees(quote.base_price)} />
              <Row k={`GST (${Math.round(quote.tax_rate * 100)}%)`} v={rupees(quote.taxes)} />
              <Row k="Service fee" v={rupees(quote.service_fee)} />
              <Row k="Security deposit" v={rupees(quote.security_deposit)} />
              <div className="flex justify-between border-t border-ink-600 pt-3 font-display text-lg text-white">
                <dt>Total</dt><dd>{rupees(quote.total_amount)}</dd>
              </div>
              <p className="pt-2 text-xs text-slate-500">
                The deposit is refunded within 7 days of return.
              </p>
            </dl>
          ) : <p className="text-sm text-slate-500">Pick your dates to see the price.</p>}
        </aside>
      </div>
    </div>
  )
}

function Field({ label, id, children }:
  { label: string; id: string; children: React.ReactNode }) {
  return <div><label className="label" htmlFor={id}>{label}</label>{children}</div>
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-slate-400"><dt>{k}</dt>
    <dd className="text-slate-200">{v}</dd></div>
}
