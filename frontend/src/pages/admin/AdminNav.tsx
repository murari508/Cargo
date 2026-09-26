import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/admin', label: 'Overview', isOverviewIcon: true, end: true },
  { to: '/admin/tracking', label: 'Car Locations & Live GPS', isLocationIcon: true },
  { to: '/admin/cars', label: 'Fleet Inventory', isCarIcon: true },
  { to: '/admin/bookings', label: 'Bookings', isBookingIcon: true },
  { to: '/admin/users', label: 'User Accounts', isUserIcon: true },
]

export default function AdminNav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 w-fit backdrop-blur-md shadow-xl">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition duration-200 flex items-center gap-1.5 ${
              isActive
                ? 'bg-signal text-black font-bold shadow-md shadow-signal/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {t.isOverviewIcon ? (
                <img
                  src={isActive ? '/overview-icon.png' : '/overview-icon-white.png'}
                  className="w-4 h-4 object-contain inline-block"
                  alt="Overview"
                />
              ) : t.isCarIcon ? (
                <img
                  src={isActive ? '/car-icon.png' : '/car-icon-white.png'}
                  className="w-4 h-4 object-contain inline-block"
                  alt="Fleet"
                />
              ) : t.isLocationIcon ? (
                <img
                  src={isActive ? '/location-icon.png' : '/location-icon-white.png'}
                  className="w-4 h-4 object-contain inline-block"
                  alt="Location"
                />
              ) : t.isBookingIcon ? (
                <img
                  src={isActive ? '/booking-icon.png' : '/booking-icon-white.png'}
                  className="w-4 h-4 object-contain inline-block"
                  alt="Bookings"
                />
              ) : (
                <img
                  src={isActive ? '/user-icon.png' : '/user-icon-white.png'}
                  className="w-4 h-4 object-contain inline-block"
                  alt="Users"
                />
              )}
              <span>{t.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
