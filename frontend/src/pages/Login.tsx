import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ErrorNote } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import LoginMotionBackground, { TimeTheme } from '../components/LoginMotionBackground'
import ThemeCursor from '../components/ThemeCursor'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  // Detect time of day: 5 AM to 5:59 PM is morning, otherwise night
  const defaultTheme: TimeTheme = (() => {
    const hour = new Date().getHours()
    return hour >= 5 && hour < 18 ? 'morning' : 'night'
  })()

  const [theme, setTheme] = useState<TimeTheme>(defaultTheme)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isMorning = theme === 'morning'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await login(form.email, form.password)
      navigate(
        location.state?.from ?? (user.role === 'admin' ? '/admin' : '/dashboard'),
        { replace: true }
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (email: string, pass: string) => {
    setForm({ email, password: pass })
    setError(null)
  }

  return (
    <div className="relative min-h-[calc(100vh-10rem)] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      {/* Interactive Morning / Night Custom Cursor */}
      <ThemeCursor theme={theme} />

      {/* Dynamic Motion Background (Morning Sun & Rays / Night Stars & Moon) */}
      <LoginMotionBackground theme={theme} />

      <div className="w-full max-w-md">
        {/* Header with Time Mode Switcher */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`pill text-xs font-semibold tracking-wider transition-all duration-500 ${
                isMorning
                  ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
              }`}
            >
              {isMorning ? '☀️ Sunrise Drive · 06:30 AM' : '🌙 Midnight Cruise · 11:45 PM'}
            </span>
          </div>

          {/* Interactive Motion Mode Switcher */}
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-2xl shadow-xl">
            <button
              type="button"
              onClick={() => setTheme('morning')}
              aria-label="Switch to morning background"
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                isMorning
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-ink-900 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ☀️ Morning
            </button>
            <button
              type="button"
              onClick={() => setTheme('night')}
              aria-label="Switch to night background"
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                !isMorning
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.6)] scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌙 Night
            </button>
          </div>
        </div>

        {/* Login Glassmorphism Card */}
        <div
          className={`card relative overflow-hidden rounded-2xl border p-7 backdrop-blur-2xl transition-all duration-700 ${
            isMorning
              ? 'border-amber-500/30 bg-ink-900/85 shadow-[0_24px_70px_-15px_rgba(245,158,11,0.2)]'
              : 'border-cyan-500/30 bg-ink-900/85 shadow-[0_24px_70px_-15px_rgba(56,189,248,0.2)]'
          }`}
        >
          {/* Card subtle ambient light corner accent */}
          <div
            className={`pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full blur-3xl transition-colors duration-1000 ${
              isMorning ? 'bg-amber-400/20' : 'bg-cyan-400/15'
            }`}
          />

          <div className="relative mb-6">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {isMorning
                ? 'Catch the morning sunrise on the open road.'
                : 'Cruise through the night with self-drive freedom.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                className={`field transition-colors duration-300 ${
                  isMorning ? 'focus:border-amber-400' : 'focus:border-cyan-400'
                }`}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={`field transition-colors duration-300 ${
                  isMorning ? 'focus:border-amber-400' : 'focus:border-cyan-400'
                }`}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && <ErrorNote message={error} />}

            <button
              className={`btn w-full font-semibold transition-all duration-300 disabled:opacity-50 ${
                isMorning
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-ink-900 hover:from-amber-300 hover:to-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
              }`}
              disabled={busy}
            >
              {busy ? 'Signing in…' : 'Sign in to CarGo'}
            </button>

            <div className="flex items-center justify-between pt-1 text-sm">
              <Link
                to="/forgot-password"
                className="text-slate-400 transition hover:text-signal"
              >
                Forgot password?
              </Link>
              <Link
                to="/register"
                className="text-slate-400 transition hover:text-signal"
              >
                Create account
              </Link>
            </div>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-2 text-center text-xs font-medium text-slate-400">
              Quick demo login:
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo('ravi@example.com', 'Password1')}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Customer (Ravi)
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@cargo.in', 'CarGoAdmin1')}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Admin (CarGo)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

