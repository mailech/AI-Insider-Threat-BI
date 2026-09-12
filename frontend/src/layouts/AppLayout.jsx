import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Brain,
  Check,
  ChevronDown,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Radar,
  Settings,
  Shield,
  Sun,
  Users,
  UserCog,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNotifications } from '../hooks/useNotifications'
import { fmtTimeAgo } from '../utils/format'
import { SeverityBadge } from '../components/ui'

const ALL = ['security_analyst', 'soc_engineer', 'security_manager', 'administrator']

// Navigation is scoped to what a role actually does, so the console differs
// meaningfully between an analyst working a queue, an engineer running the
// detection engines, and a manager reading posture.
const NAV = [
  {
    section: 'Monitor',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ALL },
      { to: '/alerts', label: 'Threat alerts', icon: AlertTriangle, roles: ['security_analyst', 'soc_engineer', 'administrator'] },
      { to: '/anomalies', label: 'Anomalies', icon: Radar, roles: ['security_analyst', 'soc_engineer', 'administrator'] },
      { to: '/investigations', label: 'Investigations', icon: Shield, roles: ALL },
    ],
  },
  {
    section: 'Analyse',
    items: [
      { to: '/employees', label: 'Employees', icon: Users, roles: ALL },
      { to: '/activity', label: 'Activity monitor', icon: Activity, roles: ['security_analyst', 'soc_engineer', 'administrator'] },
      { to: '/ueba', label: 'UEBA intelligence', icon: Brain, roles: ALL },
      { to: '/analytics', label: 'Behaviour analytics', icon: BarChart3, roles: ['soc_engineer', 'security_manager', 'administrator'] },
    ],
  },
  {
    section: 'Manage',
    items: [
      { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ALL },
      { to: '/admin', label: 'Administration', icon: UserCog, roles: ['administrator'] },
    ],
  },
]

function ThemeToggle() {
  const { mode, cycle } = useTheme()
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor
  const label = mode === 'system' ? 'System theme' : mode === 'dark' ? 'Dark theme' : 'Light theme'
  return (
    <button type="button" className="btn btn-quiet px-2 py-2" onClick={cycle} title={label} aria-label={label}>
      <Icon size={16} />
    </button>
  )
}

function Sidebar({ open, onClose, role, roleLabel, connected }) {
  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex w-60 flex-col hairline-r transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
      style={{ background: 'var(--surface)' }}
    >
      <div className="flex h-14 items-center gap-2.5 px-4 hairline-b">
        <Shield size={18} className="text-accent" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight">Insider Threat</span>
          <span className="block text-2xs text-ink-muted">{roleLabel}</span>
        </span>
        <button type="button" className="ml-auto text-ink-muted lg:hidden" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((item) => item.roles.includes(role))
          if (!items.length) return null
          return (
            <div key={group.section} className="mb-5">
              <p className="eyebrow px-2.5 pb-1.5">{group.section}</p>
              {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors',
                      isActive
                        ? 'font-medium text-ink'
                        : 'text-ink-secondary hover:text-ink',
                    )
                  }
                  style={({ isActive }) => (isActive ? { background: 'var(--surface-sunken)' } : undefined)}
                >
                  <Icon size={15} className="shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="flex items-center gap-2 px-4 py-3 hairline-t">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: connected ? 'var(--sev-low)' : 'var(--ink-faint)' }}
        />
        <span className="text-2xs text-ink-muted">{connected ? 'Live feed' : 'Feed offline'}</span>
      </div>
    </aside>
  )
}

function NotificationBell({ items, unread, onRead, onReadAll, open, setOpen, navigate }) {
  return (
    <div className="relative">
      <button
        type="button"
        className="btn btn-quiet relative px-2 py-2"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--sev-critical)' }}
          />
        )}
      </button>
      {open && (
        <div className="panel absolute right-0 z-30 mt-2 w-[22rem] max-w-[92vw] overflow-hidden">
          <div className="panel-head">
            <span className="panel-title">
              Notifications {unread > 0 && <span className="ml-1 text-ink-muted">({unread} unread)</span>}
            </span>
            <button type="button" className="text-2xs link" onClick={onReadAll}>
              <Check size={12} className="mr-1 inline" />
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="p-4 text-sm text-ink-muted">No notifications yet.</p>}
            {items.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  onRead(note.id)
                  setOpen(false)
                  if (note.link) navigate(note.link)
                }}
                className="block w-full px-4 py-3 text-left hairline-b transition-colors hover:bg-surface-hover"
                style={!note.is_read ? { background: 'var(--accent-wash)' } : undefined}
              >
                <div className="mb-1 flex items-center gap-2">
                  <SeverityBadge value={note.severity} />
                  <span className="ml-auto text-2xs text-ink-muted">{fmtTimeAgo(note.created_at)}</span>
                </div>
                <p className="text-[13px] leading-snug text-ink">{note.title}</p>
                {note.body && <p className="mt-0.5 line-clamp-2 text-2xs text-ink-muted">{note.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UserMenu({ user, roleLabel, open, setOpen, navigate, onSignOut }) {
  const initials = (user?.full_name || 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
  return (
    <div className="relative">
      <button type="button" className="btn btn-quiet gap-2 px-2 py-1.5" onClick={() => setOpen(!open)}>
        <span
          className="grid h-7 w-7 place-items-center rounded-full text-2xs font-semibold"
          style={{ background: 'var(--surface-sunken)', color: 'var(--ink-secondary)' }}
        >
          {initials}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13px] text-ink">{user?.full_name}</span>
          <span className="block text-2xs text-ink-muted">{roleLabel}</span>
        </span>
        <ChevronDown size={13} className="text-ink-faint" />
      </button>
      {open && (
        <div className="panel absolute right-0 z-30 mt-2 w-48 p-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-ink-secondary hover:bg-surface-hover hover:text-ink"
            onClick={() => {
              setOpen(false)
              navigate('/settings')
            }}
          >
            <Settings size={14} /> Profile and settings
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] hover:bg-surface-hover"
            style={{ color: 'var(--sev-critical)' }}
            onClick={onSignOut}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { user, role, roleLabel, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { items, unread, connected, markRead, markAllRead } = useNotifications(Boolean(user))

  function handleSignOut() {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role={role}
        roleLabel={roleLabel}
        connected={connected}
      />
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="lg:pl-60">
        <header
          className="sticky top-0 z-20 flex h-14 items-center gap-2 px-4 hairline-b sm:px-6"
          style={{ background: 'var(--plane)' }}
        >
          <button type="button" className="text-ink-secondary lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={19} />
          </button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell
              items={items}
              unread={unread}
              onRead={markRead}
              onReadAll={markAllRead}
              open={bellOpen}
              setOpen={setBellOpen}
              navigate={navigate}
            />
            <UserMenu
              user={user}
              roleLabel={roleLabel}
              open={menuOpen}
              setOpen={setMenuOpen}
              navigate={navigate}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
