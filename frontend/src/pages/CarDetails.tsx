import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AvailabilityPill, Breadcrumb, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { api, rupees } from '../services/api'
import type { Availability, PriceQuote } from '../types'

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

export default function CarDetails() {
  const { id } = useParams()
  const carId = Number(id)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [pickup, setPickup] = useState(params.get('pickup_date') ?? inDays(1))
  const [ret, setRet] = useState(params.get('return_date') ?? inDays(3))
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [quote, setQuote] = useState<PriceQuote | null>(null)
  const [checking, setChecking] = useState(false)
  const [saved, setSaved] = useState(false)

  const car = useAsync(() => api.cars.one(carId), [carId])

  useEffect(() => {
    if (!carId || !pickup || !ret || ret < pickup) return
    setChecking(true)
    Promise.all([
      api.cars.availability(carId, pickup, ret),
      api.bookings.quote(carId, pickup, ret),
    ])
      .then(([a, q]) => { setAvailability(a); setQuote(q) })
      .catch(() => { setAvailability(null); setQuote(null) })
      .finally(() => setChecking(false))
  }, [carId, pickup, ret])

  if (car.loading) return <div className="shell"><Spinner label="Loading car" /></div>
  if (car.error || !car.data) return (
    <div className="shell py-10"><ErrorNote message={car.error ?? 'Car not found'} /></div>
  )

  const c = car.data
  const free = availability?.available ?? null

  const book = () => {
    if (!user) return navigate('/login', { state: { from: `/cars/${carId}` } })
    navigate(`/book/${carId}?pickup_date=${pickup}&return_date=${ret}`)
  }

  const toggleSave = async () => {
    if (!user) return navigate('/login')
    saved ? await api.users.unsaveCar(carId) : await api.users.saveCar(carId)
    setSaved(!saved)
  }

  return (
    <div className="shell py-8">
      <Breadcrumb to="/cars">← Back to search</Breadcrumb>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl2 border border-ink-600 bg-gradient-to-b from-slate-900/70 via-ink-900 to-ink-950 p-6 flex items-center justify-center">
            <img src={c.image_url} alt={`${c.brand} ${c.model}`}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/cars/creta.jpg' }}
              className="aspect-[16/10] w-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]" />
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl">{c.brand} {c.model}</h1>
                {c.fuel_type === 'Electric' && (
                  <span className="pill bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">⚡ EV</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {c.year} · {c.category} · {c.location}
              </p>
            </div>
            <AvailabilityPill available={free} />
          </div>

          <p className="mt-5 max-w-prose leading-relaxed text-slate-300">{c.description}</p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[['Seats', `${c.seats}`], ['Transmission', c.transmission],
              ['Fuel', c.fuel_type], [c.fuel_type === 'Electric' ? 'Driving Range' : 'Mileage', c.mileage || '—']].map(([k, v]) => (
              <div key={k} className="card p-4">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-1 text-white">{v}</dd>
              </div>
            ))}
          </dl>

          {c.feature_list.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg">What's included</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {c.feature_list.map(f => (
                  <li key={f} className="pill bg-white/5 text-slate-300 ring-1 ring-white/10">{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-24">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl text-signal">{rupees(c.price_per_day)}</span>
            <span className="text-sm text-slate-500">per day</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p">Pickup</label>
              <input id="p" type="date" className="field" value={pickup}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setPickup(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="r">Return</label>
              <input id="r" type="date" className="field" value={ret} min={pickup}
                onChange={e => setRet(e.target.value)} />
            </div>
          </div>

          {checking && <p className="text-sm text-slate-500">Checking those dates…</p>}

          {availability && !availability.available && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-200">
              <p>{availability.reason}</p>
              {availability.conflicting_dates.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-300/80">
                  {availability.conflicting_dates.map((d, i) => (
                    <li key={i}>Booked {d.pickup_date} → {d.return_date}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {quote && (
            <dl className="space-y-2 border-t border-ink-600 pt-4 text-sm">
              <Row k={`${rupees(quote.price_per_day)} × ${quote.rental_days} days`}
                   v={rupees(quote.base_price)} />
              <Row k={`GST (${Math.round(quote.tax_rate * 100)}%)`} v={rupees(quote.taxes)} />
              <Row k="Service fee" v={rupees(quote.service_fee)} />
              <Row k="Security deposit (refundable)" v={rupees(quote.security_deposit)} />
              <div className="flex justify-between border-t border-ink-600 pt-3 font-display text-lg text-white">
                <dt>Total</dt><dd>{rupees(quote.total_amount)}</dd>
              </div>
            </dl>
          )}

          <button onClick={book} disabled={free !== true} className="btn-primary w-full">
            {free === false ? 'Not free on these dates' : 'Continue to booking'}
          </button>
          <button onClick={toggleSave} className="btn-quiet w-full">
            {saved ? 'Saved to your list' : 'Save for later'}
          </button>
          <p className="text-center text-xs text-slate-500">
            Prices are calculated by CarGo, not your browser.
          </p>
        </aside>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-slate-400">
      <dt>{k}</dt><dd className="text-slate-200">{v}</dd>
    </div>
  )
}
