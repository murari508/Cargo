import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote } from '../components/ui'
import { api } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [stage, setStage] = useState<'request' | 'reset' | 'done'>('request')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await api.auth.forgotPassword(email)
      setNote(res.message)
      if (res.reset_token) { setToken(res.reset_token); setStage('reset') }
    } catch (e) { setError((e as Error).message) }
  }

  const reset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await api.auth.resetPassword(token, password)
      setStage('done')
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="shell max-w-md py-20">
      <h1 className="text-3xl">Reset your password</h1>

      {stage === 'request' && (
        <form onSubmit={request} className="card mt-8 space-y-4 p-6">
          <p className="text-sm text-slate-400">
            Enter the email on your account and we'll send a reset link.
          </p>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="field" value={email}
              onChange={e => setEmail(e.target.value)} />
          </div>
          {error && <ErrorNote message={error} />}
          {note && <p className="text-sm text-road">{note}</p>}
          <button className="btn-primary w-full">Send reset link</button>
        </form>
      )}

      {stage === 'reset' && (
        <form onSubmit={reset} className="card mt-8 space-y-4 p-6">
          <p className="text-sm text-slate-400">
            This build returns the reset token directly instead of emailing it.
          </p>
          <div>
            <label className="label" htmlFor="token">Reset token</label>
            <input id="token" required className="field font-mono text-xs" value={token}
              onChange={e => setToken(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="np">New password</label>
            <input id="np" type="password" required minLength={8} className="field"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <ErrorNote message={error} />}
          <button className="btn-primary w-full">Update password</button>
        </form>
      )}

      {stage === 'done' && (
        <div className="card mt-8 space-y-4 p-6">
          <p className="text-slate-300">Password updated.</p>
          <Link to="/login" className="btn-primary">Sign in</Link>
        </div>
      )}
    </div>
  )
}
