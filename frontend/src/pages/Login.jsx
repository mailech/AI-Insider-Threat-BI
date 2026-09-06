import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const ROLE_HOME = {
  security_analyst: '/analyst',
  soc_engineer: '/soc',
  security_manager: '/manager',
  administrator: '/admin',
}

const DEMO_ACCOUNTS = [
  ['analyst@company.com', 'Security Analyst'],
  ['soc@company.com', 'SOC Engineer'],
  ['manager@company.com', 'Security Manager'],
  ['admin@company.com', 'Administrator'],
]

export default function Login() {
  const [email, setEmail] = useState('analyst@company.com')
  const [password, setPassword] = useState('Password123!')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const user = await login(email, password)
      navigate(ROLE_HOME[user.role] || '/analyst')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-mono text-signal-cyan text-xs tracking-widest">INSIDER THREAT</div>
          <div className="text-xl font-semibold text-slate-100 mt-1">Behavioral Intelligence System</div>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              className="w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-cyan"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-cyan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-signal-red text-sm">{error}</div>}
          <button className="w-full bg-signal-cyan/90 hover:bg-signal-cyan text-base-950 font-semibold rounded-md py-2 text-sm transition-colors">
            Sign in
          </button>
        </form>
        <div className="mt-5 text-xs text-slate-500">
          <div className="mb-1 uppercase tracking-wide">Demo accounts (password: Password123!)</div>
          {DEMO_ACCOUNTS.map(([mail, role]) => (
            <button
              key={mail}
              onClick={() => setEmail(mail)}
              className="block hover:text-signal-cyan"
            >
              {mail} — {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
