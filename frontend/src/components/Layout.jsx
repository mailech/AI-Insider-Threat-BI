import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { ADMIN_ONLY, ROLE_LABELS } from '../lib/constants'
import { initials } from '../lib/format'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '▤', end: true },
  { to: '/employees', label: 'Employees', icon: '☰' },
  { to: '/activity', label: 'Activity Monitor', icon: '⏱' },
  { to: '/admin/users', label: 'User Management', icon: '⚙', roles: ADMIN_ONLY },
]

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(item.roles))

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-hairline bg-surface md:flex md:flex-col">
        <div className="border-b border-hairline px-5 py-5">
          <p className="text-sm font-semibold leading-tight">Insider Threat</p>
          <p className="text-xs text-ink-muted">Behavioral Intelligence</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-ink-secondary hover:bg-raised hover:text-ink'
                }`
              }
            >
              <span aria-hidden="true" className="text-base">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline p-3 text-xs text-ink-muted">
          Milestone 1 · v0.1.0
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-hairline bg-surface px-6 py-3">
          <nav className="flex gap-3 overflow-x-auto md:hidden">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap text-sm ${isActive ? 'text-accent' : 'text-ink-secondary'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <NavLink to="/profile" className="flex items-center gap-3 text-right">
              <div className="hidden sm:block">
                <p className="text-sm leading-tight">{user?.full_name}</p>
                <p className="text-xs text-ink-muted">{ROLE_LABELS[user?.role] || user?.role}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                {initials(user?.full_name)}
              </span>
            </NavLink>
            <button type="button" onClick={logout} className="btn-ghost">
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
