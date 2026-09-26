import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote, PageHeader, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { api, rupees } from '../services/api'
import type { TripPlan } from '../types'

export default function TripPlanner() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    origin: 'Hyderabad', destination: 'Goa', duration: 3, passengers: 4,
    language: 'en',
  })
  const [plan, setPlan] = useState<TripPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState('')

  const generate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null); setSavedNote('')
    try {
      setPlan(await api.ai.planTrip(form))
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const save = async () => {
    try {
      await api.ai.saveTrip(form)
      setSavedNote('Saved to your account.')
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="shell py-10">
      <PageHeader title="Road trip planner"
        subtitle="Pick two cities and we'll shape the days, the stops and the right car." />

      <form onSubmit={generate} className="glass grid gap-4 p-6 sm:grid-cols-5">
        <div>
          <label className="label" htmlFor="o">From</label>
          <input id="o" className="field" value={form.origin}
            onChange={e => setForm({ ...form, origin: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="d">To</label>
          <input id="d" className="field" value={form.destination}
            onChange={e => setForm({ ...form, destination: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="days">Days</label>
          <input id="days" type="number" min={1} max={21} className="field" value={form.duration}
            onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label" htmlFor="pax">People</label>
          <input id="pax" type="number" min={1} max={12} className="field" value={form.passengers}
            onChange={e => setForm({ ...form, passengers: Number(e.target.value) })} />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Planning…' : 'Plan trip'}
          </button>
        </div>
      </form>

      {error && <div className="mt-6"><ErrorNote message={error} /></div>}
      {busy && <Spinner label="Mapping the route" />}

      {plan && (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-2xl">
              {plan.origin} → {plan.destination}
              {plan.distance_km && (
                <span className="ml-3 text-sm font-normal text-slate-500">
                  about {plan.distance_km} km each way
                </span>
              )}
            </h2>

            <ol className="mt-6 space-y-4">
              {plan.itinerary.map(d => (
                <li key={d.day} className="card p-5">
                  <p className="text-sm text-signal">Day {d.day}</p>
                  <h3 className="mt-1 text-lg">{d.title}</h3>
                  <ul className="mt-3 space-y-1 text-sm text-slate-400">
                    {d.items.map(i => <li key={i}>{i}</li>)}
                  </ul>
                </li>
              ))}
            </ol>

            {plan.notes && plan.notes.length > 0 && (
              <div className="card mt-6 p-5">
                <h3 className="text-base">Worth knowing</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
                  {plan.notes.map(n => <li key={n}>{n}</li>)}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            {plan.estimated_rental_cost != null && (
              <div className="card p-5">
                <p className="text-sm text-slate-400">Estimated rental</p>
                <p className="mt-1 font-display text-3xl text-signal">
                  {rupees(plan.estimated_rental_cost)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {plan.duration} days including GST, deposit separate
                </p>
              </div>
            )}

            {(plan.suggested_cars?.length ?? 0) > 0 && (
              <div className="card p-5">
                <h3 className="text-base">Cars that suit this trip</h3>
                <ul className="mt-3 space-y-2">
                  {plan.suggested_cars!.slice(0, 4).map(c => (
                    <li key={c.id}>
                      <Link to={`/cars/${c.id}`}
                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                        <img src={c.image_url} alt="" className="h-12 w-16 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white">
                            {c.brand} {c.model}
                          </span>
                          <span className="text-xs text-slate-500">
                            {c.seats} seats · {c.transmission}
                          </span>
                        </span>
                        <span className="text-sm text-signal">{rupees(c.price_per_day)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {user ? (
              <button onClick={save} className="btn-ghost w-full">Save this plan</button>
            ) : (
              <Link to="/login" className="btn-ghost w-full">Sign in to save this plan</Link>
            )}
            {savedNote && <p className="text-center text-sm text-road">{savedNote}</p>}
          </aside>
        </div>
      )}
    </div>
  )
}
