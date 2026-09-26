import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CarCard from '../components/CarCard'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import { Spinner } from '../components/ui'

const today = () => new Date().toISOString().slice(0, 10)
const inDays = (n: number) =>
  new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

export default function Home() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    location: '', pickup_date: inDays(1), return_date: inDays(3),
  })
  const featured = useAsync(() => api.cars.list({ page_size: 6, sort: 'price_asc' }), [])
  const filters = useAsync(() => api.cars.filters(), [])

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(form as Record<string, string>)
    navigate(`/cars?${params.toString()}`)
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1900&q=80"
            alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/60 via-ink-900/85 to-ink-900" />
        </div>

        <div className="shell pb-16 pt-20 sm:pt-28">
          <p className="mb-4 text-sm text-signal font-medium">⚡ Premium & Electric Self-Drive Mobility</p>
          <h1 className="max-w-3xl font-display text-4xl leading-[1.08] sm:text-6xl">
            Tell us where you're going.<br />We'll have the keys ready.
          </h1>
          <p className="mt-5 max-w-lg text-slate-400">
            Premium self-drive cars across India, booked in three taps. Verified fleet,
            100% transparent pricing, and instant doorstep delivery.
          </p>

          <form onSubmit={search} className="glass mt-10 grid gap-4 p-5 sm:grid-cols-4 sm:p-6">
            <div className="sm:col-span-1">
              <label className="label" htmlFor="loc">Pickup city</label>
              <select id="loc" className="field" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}>
                <option value="">Anywhere</option>
                {filters.data?.locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pd">Pickup</label>
              <input id="pd" type="date" className="field" min={today()} value={form.pickup_date}
                onChange={e => setForm({ ...form, pickup_date: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="rd">Return</label>
              <input id="rd" type="date" className="field" min={form.pickup_date}
                value={form.return_date}
                onChange={e => setForm({ ...form, return_date: e.target.value })} />
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full">Find cars</button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-400">
            <span>Prices include GST and a refundable deposit</span>
            <span>Free cancellation before pickup</span>
            <span>Unlimited kilometres on weekly rentals</span>
          </div>
        </div>
      </section>

      <section className="shell py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl">In the fleet right now</h2>
          <Link to="/cars" className="btn-ghost">See all cars</Link>
        </div>
        {featured.loading ? <Spinner label="Loading the fleet" /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data?.items.map(c => <CarCard key={c.id} car={c} />)}
          </div>
        )}
      </section>

      <section className="shell pb-20">
        <div className="glass p-8 sm:p-10 space-y-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-semibold">Engineered for the Open Road</h2>
            <p className="mt-2 text-slate-400">
              From electric city commuters to rugged 4x4 SUVs and luxury sedans, every CarGo vehicle comes sanitized, fully insured, and backed by 24/7 roadside assistance.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5 border border-white/10 bg-slate-900/60">
              <span className="text-3xl">⚡</span>
              <h3 className="mt-3 font-semibold text-white">100% Electric Fleet</h3>
              <p className="mt-1 text-xs text-slate-400">Certified ARAI ranges from 230 km to 650 km with fast charging support.</p>
            </div>
            <div className="card p-5 border border-white/10 bg-slate-900/60">
              <span className="text-3xl">🛡️</span>
              <h3 className="mt-3 font-semibold text-white">Transparent Pricing</h3>
              <p className="mt-1 text-xs text-slate-400">All prices include comprehensive insurance, GST, and zero hidden charges.</p>
            </div>
            <div className="card p-5 border border-white/10 bg-slate-900/60">
              <span className="text-3xl">🔑</span>
              <h3 className="mt-3 font-semibold text-white">Doorstep Delivery</h3>
              <p className="mt-1 text-xs text-slate-400">Receive your car directly at your doorstep, airport, or regional hub on time.</p>
            </div>
            <div className="card p-5 border border-white/10 bg-slate-900/60">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <img src="/location-icon-white.png" className="w-5 h-5 object-contain" alt="Location" />
              </div>
              <h3 className="mt-3 font-semibold text-white">Live Road Assistance</h3>
              <p className="mt-1 text-xs text-slate-400">24/7 roadside support across national highways and tourist destinations.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
