import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { BookingStatus } from '../types'

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-signal border-t-transparent" />
      {label}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-quiet mt-2 px-0 text-signal">Try again</button>
      )}
    </div>
  )
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-sm text-sm text-slate-400">{body}</p>
      {action}
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20',
  confirmed: 'bg-road/10 text-road ring-1 ring-road/25',
  active: 'bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/20',
  completed: 'bg-white/5 text-slate-300 ring-1 ring-white/10',
  cancelled: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20',
  paid: 'bg-road/10 text-road ring-1 ring-road/25',
  unpaid: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20',
  refunded: 'bg-white/5 text-slate-300 ring-1 ring-white/10',
  failed: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20',
}

export function StatusPill({ status }: { status: BookingStatus | string }) {
  return <span className={`pill ${STATUS_STYLE[status] ?? STATUS_STYLE.completed}`}>{status}</span>
}

export function AvailabilityPill({ available }: { available: boolean | null }) {
  if (available === null) return null
  return available
    ? <span className="pill bg-road/10 text-road ring-1 ring-road/25">Available</span>
    : <span className="pill bg-red-500/10 text-red-300 ring-1 ring-red-500/20">Unavailable</span>
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 font-display text-3xl text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }:
  { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Breadcrumb({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="text-sm text-slate-400 transition hover:text-signal">{children}</Link>
}
