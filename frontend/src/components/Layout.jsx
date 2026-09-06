import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const ROLE_LABELS = {
  security_analyst: 'Security Analyst',
  soc_engineer: 'SOC Engineer',
  security_manager: 'Security Manager',
  administrator: 'Administrator',
}

const NAV_BY_ROLE = {
  security_analyst: [{ to: '/analyst', label: 'Analyst Dashboard' }],
  soc_engineer: [{ to: '/soc', label: 'SOC Dashboard' }],
  security_manager: [{ to: '/manager', label: 'Manager Dashboard' }],
  administrator: [{ to: '/admin', label: 'Admin Dashboard' }],
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links = [
    ...(NAV_BY_ROLE[user?.role] || []),
    { to: '/employees', label: 'Employees' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/incidents', label: 'Investigations' },
  ]

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-base-900 border-r border-base-700 flex flex-col">
        <div className="px-5 py-6 border-b border-base-700">
          <div className="font-mono text-signal-cyan text-xs tracking-widest">INSIDER THREAT</div>
          <div className="font-semibold text-slate-100 leading-tight mt-1">
            Behavioral Intelligence System
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-base-700 text-slate-50'
                    : 'text-slate-400 hover:bg-base-800 hover:text-slate-200'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-base-700">
          <div className="text-sm text-slate-200">{user?.full_name}</div>
          <div className="text-xs text-slate-500 font-mono">{ROLE_LABELS[user?.role]}</div>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="mt-3 text-xs text-slate-500 hover:text-signal-red transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
