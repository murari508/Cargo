import { Link } from 'react-router-dom'
import { rupees } from '../services/api'
import type { Car } from '../types'
import { AvailabilityPill } from './ui'

export default function CarCard({ car, query = '' }: { car: Car; query?: string }) {
  const unavailable = car.is_available === false
  return (
    <article className={`card group overflow-hidden transition ${unavailable ? 'opacity-60' : ''}`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-b from-slate-900/70 via-ink-900 to-ink-950 flex items-center justify-center p-3">
        <img
          src={car.image_url} alt={`${car.brand} ${car.model}`} loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/cars/creta.jpg' }}
          className="h-full w-full object-contain transition duration-500 group-hover:scale-105 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="pill bg-black/60 text-slate-200 backdrop-blur">{car.category}</span>
          {car.fuel_type === 'Electric' && (
            <span className="pill bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 backdrop-blur font-medium">⚡ EV</span>
          )}
          <AvailabilityPill available={car.is_available} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg leading-tight">{car.brand} {car.model}</h3>
            <p className="mt-1 text-xs text-slate-500">{car.year} · {car.location}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl text-signal">{rupees(car.price_per_day)}</p>
            <p className="text-xs text-slate-500">per day</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-xs text-slate-400">
          <div><dt className="sr-only">Seats</dt><dd>{car.seats} seats</dd></div>
          <div><dt className="sr-only">Transmission</dt><dd>{car.transmission}</dd></div>
          <div><dt className="sr-only">Fuel</dt><dd>{car.fuel_type}</dd></div>
        </dl>

        <Link
          to={`/cars/${car.id}${query}`}
          className={unavailable ? 'btn-ghost w-full' : 'btn-primary w-full'}
        >
          {unavailable ? 'See other dates' : 'View details'}
        </Link>
      </div>
    </article>
  )
}
