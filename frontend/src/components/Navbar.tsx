import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm transition ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const signOut = () => { logout(); setOpen(false); navigate('/') }

  const links = (
    <>
      <NavLink to="/cars" className={linkClass} onClick={() => setOpen(false)}>Search cars</NavLink>
      {user && <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>}
      {user && <NavLink to="/bookings" className={linkClass} onClick={() => setOpen(false)}>My bookings</NavLink>}
      {isAdmin && <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>Admin</NavLink>}
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-900/80 backdrop-blur-xl">
      <nav className="shell flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Car<span className="text-signal">Go</span>
          </span>
          <span className="hidden text-xs text-slate-500 sm:inline">Your Journey. Your Car.</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">{links}</div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link to="/profile" className="btn-ghost flex items-center gap-1.5">
                <img src="/user-icon-white.png" className="w-4 h-4 object-contain inline-block" alt="Profile" />
                {user.full_name.split(' ')[0]}
              </Link>
              <button onClick={signOut} className="btn-quiet">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-quiet">Sign in</Link>
              <Link to="/register" className="btn-primary">Create account</Link>
            </>
          )}
        </div>

        <button
          className="btn-ghost md:hidden" aria-expanded={open} aria-label="Menu"
          onClick={() => setOpen(v => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </nav>

      {open && (
        <div className="shell flex flex-col gap-2 border-t border-white/5 py-4 md:hidden">
          {links}
          <div className="mt-2 flex gap-2">
            {user ? (
              <>
                <Link to="/profile" className="btn-ghost flex-1" onClick={() => setOpen(false)}>Profile</Link>
                <button onClick={signOut} className="btn-quiet">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost flex-1" onClick={() => setOpen(false)}>Sign in</Link>
                <Link to="/register" className="btn-primary flex-1" onClick={() => setOpen(false)}>Create account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
