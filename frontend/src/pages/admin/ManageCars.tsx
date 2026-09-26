import { useState } from 'react'
import { ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { api, rupees } from '../../services/api'
import type { Car } from '../../types'
import AdminNav from './AdminNav'

const BLANK = {
  brand: '', model: '', year: new Date().getFullYear(), category: 'SUV',
  price_per_day: 2000, seats: 5, fuel_type: 'Petrol', transmission: 'Manual',
  mileage: '', location: 'Hyderabad', image_url: '', description: '',
  features: '' as string, status: 'available',
}

export default function ManageCars() {
  const cars = useAsync(() => api.admin.cars(), [])
  const [editing, setEditing] = useState<Car | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [error, setError] = useState<string | null>(null)

  const openCreate = () => { setForm({ ...BLANK }); setEditing(null); setCreating(true) }
  const openEdit = (c: Car) => {
    setForm({ ...c, features: c.feature_list.join(', ') } as typeof BLANK)
    setEditing(c); setCreating(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload = {
      ...form,
      year: Number(form.year), seats: Number(form.seats),
      price_per_day: Number(form.price_per_day),
      features: form.features.split(',').map(s => s.trim()).filter(Boolean),
    }
    try {
      editing ? await api.cars.update(editing.id, payload) : await api.cars.create(payload)
      setCreating(false); setEditing(null)
      cars.reload()
    } catch (e) { setError((e as Error).message) }
  }

  const remove = async (c: Car) => {
    if (!confirm(`Remove ${c.brand} ${c.model} from the fleet?`)) return
    try { await api.cars.remove(c.id); cars.reload() }
    catch (e) { setError((e as Error).message) }
  }

  const setStatus = async (c: Car, status: string) => {
    try { await api.cars.update(c.id, { status }); cars.reload() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="shell py-10">
      <PageHeader title="Manage cars" subtitle="Add vehicles, adjust pricing, take cars off the road."
        action={<button onClick={openCreate} className="btn-primary">Add a car</button>} />
      <AdminNav />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      {creating && (
        <form onSubmit={submit} className="card mb-8 grid gap-4 p-6 sm:grid-cols-3">
          <h2 className="text-lg sm:col-span-3">{editing ? 'Edit car' : 'New car'}</h2>
          <Input label="Brand" value={form.brand} onChange={v => setForm({ ...form, brand: v })} />
          <Input label="Model" value={form.model} onChange={v => setForm({ ...form, model: v })} />
          <Input label="Year" type="number" value={String(form.year)}
            onChange={v => setForm({ ...form, year: Number(v) })} />
          <Select label="Category" value={form.category}
            options={['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Off-road']}
            onChange={v => setForm({ ...form, category: v })} />
          <Input label="Price per day (₹)" type="number" value={String(form.price_per_day)}
            onChange={v => setForm({ ...form, price_per_day: Number(v) })} />
          <Input label="Seats" type="number" value={String(form.seats)}
            onChange={v => setForm({ ...form, seats: Number(v) })} />
          <Select label="Fuel" value={form.fuel_type}
            options={['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']}
            onChange={v => setForm({ ...form, fuel_type: v })} />
          <Select label="Transmission" value={form.transmission}
            options={['Manual', 'Automatic']}
            onChange={v => setForm({ ...form, transmission: v })} />
          <Input label="Mileage" value={form.mileage} onChange={v => setForm({ ...form, mileage: v })} />
          <Input label="City" value={form.location} onChange={v => setForm({ ...form, location: v })} />
          <Select label="Status" value={form.status}
            options={['available', 'maintenance', 'retired']}
            onChange={v => setForm({ ...form, status: v })} />
          <Input label="Image URL" value={form.image_url}
            onChange={v => setForm({ ...form, image_url: v })} />
          <div className="sm:col-span-3">
            <label className="label">Description</label>
            <textarea className="field h-20" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Features (comma separated)</label>
            <input className="field" value={form.features}
              onChange={e => setForm({ ...form, features: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-3">
            <button className="btn-primary">{editing ? 'Save changes' : 'Add to fleet'}</button>
            <button type="button" onClick={() => { setCreating(false); setEditing(null) }}
              className="btn-quiet">Cancel</button>
          </div>
        </form>
      )}

      {cars.loading ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-ink-600 text-left text-xs text-slate-500">
              <tr>
                <th className="p-4">Car</th><th className="p-4">City</th>
                <th className="p-4">Type</th><th className="p-4">₹/day</th>
                <th className="p-4">Status</th><th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {cars.data?.map(c => (
                <tr key={c.id} className="border-b border-ink-600/60 last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={c.image_url} alt="" className="h-10 w-16 rounded object-cover" />
                      <span className="text-white">{c.brand} {c.model}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{c.location}</td>
                  <td className="p-4 text-slate-400">{c.category} · {c.transmission}</td>
                  <td className="p-4 text-signal">{rupees(c.price_per_day)}</td>
                  <td className="p-4">
                    <select value={c.status} onChange={e => setStatus(c, e.target.value)}
                      className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-1 text-xs">
                      <option value="available">available</option>
                      <option value="maintenance">maintenance</option>
                      <option value="retired">retired</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEdit(c)} className="btn-quiet px-2">Edit</button>
                    <button onClick={() => remove(c)} className="btn-quiet px-2 text-red-300">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }:
  { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="field" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function Select({ label, value, options, onChange }:
  { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="field" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
