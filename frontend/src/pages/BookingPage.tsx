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

  const [hasLicenseAgreement, setHasLicenseAgreement] = useState(false)

  const [form, setForm] = useState({
    pickup_date: params.get('pickup_date') ?? '',
    return_date: params.get('return_date') ?? '',
    pickup_time: '10:00',
    return_time: '18:00',
    pickup_location: '',
    return_location: '',
    destination: '',
    driving_license: user?.driving_license ?? '',
  })

  useEffect(() => {
    if (user?.driving_license && !form.driving_license) {
      setForm(f => ({ ...f, driving_license: user.driving_license ?? '' }))
    }
  }, [user?.driving_license])

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

    if (!form.driving_license || form.driving_license.trim().length < 5) {
      setError('A valid Driving Licence number is required to book a self-drive car.')
      return
    }

    if (!hasLicenseAgreement) {
      setError('You must confirm that you hold a valid, original Driving Licence.')
      return
    }

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

          {/* Driving Licence Verification Card */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🪪</span>
              <div>
                <h3 className="text-sm font-semibold text-white">Driving Licence Verification (Mandatory)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Under Motor Vehicle safety rules, only verified driving licence holders can reserve self-drive vehicles.
                </p>
              </div>
            </div>

            <div>
              <label className="label flex items-center justify-between" htmlFor="dl_num">
                <span>Government Driving Licence (DL) Number <span className="text-rose-400">*</span></span>
                {form.driving_license && form.driving_license.length >= 5 && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                    ✓ Valid DL Format
                  </span>
                )}
              </label>
              <input
                id="dl_num"
                required
                minLength={5}
                maxLength={30}
                placeholder="e.g. TS09 20210012345 or DL-1420110012345"
                className="field uppercase tracking-wider font-mono text-sm bg-black/40 border-amber-500/40 focus:border-amber-400"
                value={form.driving_license}
                onChange={e => setForm({ ...form, driving_license: e.target.value.toUpperCase() })}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Driver: {user?.full_name} · {user?.phone} · {user?.email}
              </p>
            </div>

            <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={hasLicenseAgreement}
                onChange={e => setHasLicenseAgreement(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-slate-900 text-signal focus:ring-signal"
              />
              <span>
                I certify that I hold an original, unexpired Driving Licence issued by the government, and I agree to present the physical card at car pickup.
              </span>
            </label>
          </div>

          {error && <ErrorNote message={error} />}

          <button
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || !form.driving_license || form.driving_license.trim().length < 5 || !hasLicenseAgreement}
          >
            {submitting
              ? 'Holding your car…'
              : !form.driving_license || form.driving_license.trim().length < 5
              ? 'Enter Driving Licence to Reserve'
              : !hasLicenseAgreement
              ? 'Confirm DL Declaration to Continue'
              : 'Reserve and continue to payment'}
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
