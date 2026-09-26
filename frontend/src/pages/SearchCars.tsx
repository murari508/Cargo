import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CarCard from '../components/CarCard'
import { Empty, ErrorNote, PageHeader, Spinner } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type { Car, FilterOptions } from '../types'
import AttractiveCarCursor from '../components/AttractiveCarCursor'

const FIELDS = ['location', 'category', 'seats', 'fuel_type', 'transmission',
                'min_price', 'max_price', 'pickup_date', 'return_date', 'q', 'sort'] as const

export default function SearchCars() {
  const [params, setParams] = useSearchParams()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filters = useAsync<FilterOptions>(() => api.cars.filters(), [])

  const query = useMemo(() => {
    const o: Record<string, string> = {}
    FIELDS.forEach(f => { const v = params.get(f); if (v) o[f] = v })
    return o
  }, [params])

  const availableOnly = params.get('available_only') === 'true'

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.cars.list({ ...query, available_only: availableOnly, page_size: 100 })
      .then(r => setCars(r.items))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [query, availableOnly])

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next, { replace: true })
  }

  const dated = Boolean(query.pickup_date && query.return_date)
  const suffix = dated
    ? `?pickup_date=${query.pickup_date}&return_date=${query.return_date}` : ''

  return (
    <div className="shell py-10">
      {/* Sleek Automotive Steering Wheel Cursor with Interactive Headlight Beam */}
      <AttractiveCarCursor />

      <PageHeader
        title="Search cars"
        subtitle={dated
          ? 'Availability below is checked against live bookings for your dates.'
          : 'Add pickup and return dates to see which cars are actually free.'}
      />

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <div>
            <label className="label" htmlFor="q">Brand or model</label>
            <input id="q" className="field" defaultValue={query.q ?? ''}
              placeholder="Creta, Thar…"
              onChange={e => update('q', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pd">Pickup</label>
              <input id="pd" type="date" className="field" value={query.pickup_date ?? ''}
                onChange={e => update('pickup_date', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="rd">Return</label>
              <input id="rd" type="date" className="field" value={query.return_date ?? ''}
                min={query.pickup_date} onChange={e => update('return_date', e.target.value)} />
            </div>
          </div>

          <Select id="location" label="City" value={query.location}
            options={filters.data?.locations ?? []} onChange={update} />
          <Select id="category" label="Type" value={query.category}
            options={filters.data?.categories ?? []} onChange={update} />
          <Select id="transmission" label="Transmission" value={query.transmission}
            options={filters.data?.transmissions ?? []} onChange={update} />
          <Select id="fuel_type" label="Fuel" value={query.fuel_type}
            options={filters.data?.fuel_types ?? []} onChange={update} />
          <Select id="seats" label="Seats (minimum)" value={query.seats}
            options={(filters.data?.seats ?? []).map(String)} onChange={update} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="min_price">Min ₹/day</label>
              <input id="min_price" type="number" className="field" min={0}
                defaultValue={query.min_price ?? ''}
                onChange={e => update('min_price', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="max_price">Max ₹/day</label>
              <input id="max_price" type="number" className="field" min={0}
                defaultValue={query.max_price ?? ''}
                onChange={e => update('max_price', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={availableOnly} disabled={!dated}
              onChange={e => update('available_only', e.target.checked ? 'true' : '')}
              className="h-4 w-4 rounded border-ink-600 bg-ink-900 accent-signal" />
            Only show cars free on these dates
          </label>

          <div>
            <label className="label" htmlFor="sort">Sort by</label>
            <select id="sort" className="field" value={query.sort ?? 'price_asc'}
              onChange={e => update('sort', e.target.value)}>
              <option value="price_asc">Price, low to high</option>
              <option value="price_desc">Price, high to low</option>
              <option value="seats">Most seats</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <button onClick={() => setParams(new URLSearchParams(), { replace: true })}
            className="btn-quiet w-full">Clear filters</button>
        </aside>

        <section>
          {error && <ErrorNote message={error} />}
          {loading ? <Spinner label="Checking the fleet" /> : cars.length === 0 ? (
            <Empty title="No cars match that yet"
              body="Try widening the budget, removing a filter, or picking a different city." />
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400 font-medium">
                  Showing <span className="text-white font-semibold">{cars.length}</span> {cars.length === 1 ? 'vehicle' : 'vehicles'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => update('fuel_type', '')}
                    className={`pill text-xs transition ${!query.fuel_type ? 'bg-signal text-black font-semibold' : 'bg-ink-800 text-slate-300 hover:bg-ink-700'}`}
                  >
                    All Fleet
                  </button>
                  <button
                    onClick={() => update('fuel_type', query.fuel_type === 'Electric' ? '' : 'Electric')}
                    className={`pill text-xs transition flex items-center gap-1.5 ${query.fuel_type === 'Electric' ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60'}`}
                  >
                    <span>⚡</span> 100% Electric (EVs)
                  </button>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {cars.map(c => <CarCard key={c.id} car={c} query={suffix} />)}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function Select({ id, label, value, options, onChange }: {
  id: string; label: string; value?: string; options: string[]
  onChange: (k: string, v: string) => void
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value ?? ''}
        onChange={e => onChange(id, e.target.value)}>
        <option value="">Any</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
