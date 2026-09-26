import { useState } from 'react'
import { ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services/api'
import AdminNav from './AdminNav'

export default function ManageUsers() {
  const users = useAsync(() => api.admin.users(), [])
  const [error, setError] = useState<string | null>(null)

  const setRole = async (id: number, role: string) => {
    setError(null)
    try { await api.admin.setRole(id, role); users.reload() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="shell py-10">
      <PageHeader title="Users" subtitle="Everyone with a CarGo account." />
      <AdminNav />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      {users.loading ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-ink-600 text-left text-xs text-slate-500">
              <tr>
                <th className="p-4">Name</th><th className="p-4">Contact</th>
                <th className="p-4">Language</th><th className="p-4">Bookings</th>
                <th className="p-4">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map(u => (
                <tr key={u.id} className="border-b border-ink-600/60 last:border-0">
                  <td className="p-4 text-white">{u.full_name}</td>
                  <td className="p-4 text-slate-400">
                    {u.email}<span className="block text-xs text-slate-600">{u.phone}</span>
                  </td>
                  <td className="p-4 text-slate-400">{u.preferred_language}</td>
                  <td className="p-4 text-slate-200">{u.bookings}</td>
                  <td className="p-4">
                    <select value={u.role} onChange={e => setRole(u.id, e.target.value)}
                      className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-1 text-xs">
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
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
