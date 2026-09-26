import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorNote } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import type { LangCode } from '../types'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '',
    preferred_language: 'auto' as LangCode,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await register(form)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="shell max-w-md py-16">
      <h1 className="text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-slate-400">Takes a minute. No card needed to sign up.</p>

      <form onSubmit={submit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required minLength={2} className="field" value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Mobile number</label>
          <input id="phone" required pattern="[6-9][0-9]{9}" inputMode="numeric"
            placeholder="10 digits" className="field" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} className="field"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} />
          <p className="mt-1 text-xs text-slate-500">
            At least 8 characters, mixing letters and numbers.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="lang">Language for the assistant</label>
          <select id="lang" className="field" value={form.preferred_language}
            onChange={e => setForm({ ...form, preferred_language: e.target.value as LangCode })}>
            <option value="auto">Auto detect</option>
            <option value="en">English</option>
            <option value="te">తెలుగు</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
        {error && <ErrorNote message={error} />}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-400">
          Already with us? <Link to="/login" className="text-signal">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
