import { useState } from 'react'
import { ErrorNote, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    phone: user?.phone ?? '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSaved(false)
    try {
      const updated = await api.users.update(form)
      setUser(updated)
      setSaved(true)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="shell max-w-2xl py-10">
      <PageHeader title="Profile" subtitle="Your personal details and account settings." />

      <form onSubmit={submit} className="card space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="field" value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile number</label>
            <input id="phone" className="field" pattern="[6-9][0-9]{9}" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="field opacity-60" value={user?.email} disabled />
          <p className="mt-1 text-xs text-slate-500">Contact support to change your email.</p>
        </div>

        {error && <ErrorNote message={error} />}
        {saved && <p className="text-sm text-road">Saved.</p>}
        <button className="btn-primary">Save changes</button>
      </form>
    </div>
  )
}
