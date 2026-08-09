import { useCallback, useEffect, useState } from 'react'

import { apiErrorMessage } from '../api/client'
import { usersApi } from '../api/resources'
import { useAuth } from '../auth/AuthContext'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { ROLE_LABELS, ROLES } from '../lib/constants'
import { formatDate } from '../lib/format'

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    usersApi
      .list()
      .then((data) => {
        setUsers(data)
        setError('')
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load users')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function update(id, payload) {
    try {
      await usersApi.update(id, payload)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update the user'))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">User Management</h1>
        <p className="text-sm text-ink-secondary">
          Platform accounts and role assignment for the security team
        </p>
      </div>

      {error ? <p className="card text-sm text-critical">{error}</p> : null}

      <div className="card p-0">
        <DataTable
          columns={[
            {
              key: 'full_name',
              header: 'User',
              render: (row) => (
                <div>
                  <p className="font-medium">
                    {row.full_name}
                    {row.id === currentUser?.id ? (
                      <span className="ml-2 text-xs text-ink-muted">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-muted">{row.email}</p>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              render: (row) => (
                <select
                  className="field w-44 py-1 text-xs"
                  value={row.role}
                  disabled={row.id === currentUser?.id}
                  onChange={(event) => update(row.id, { role: event.target.value })}
                >
                  {Object.values(ROLES).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              key: 'is_active',
              header: 'Status',
              render: (row) =>
                row.is_active ? (
                  <Badge severity="good">Active</Badge>
                ) : (
                  <Badge severity="critical">Deactivated</Badge>
                ),
            },
            {
              key: 'created_at',
              header: 'Created',
              className: 'tabular text-ink-secondary',
              render: (row) => formatDate(row.created_at),
            },
            {
              key: 'actions',
              header: '',
              render: (row) =>
                row.id === currentUser?.id ? null : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={row.is_active ? 'btn-danger px-2 py-1 text-xs' : 'btn-ghost px-2 py-1 text-xs'}
                      onClick={() => update(row.id, { is_active: !row.is_active })}
                    >
                      {row.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                ),
            },
          ]}
          rows={users}
          loading={loading}
          emptyMessage="No users yet."
        />
      </div>

      <p className="text-xs text-ink-muted">
        You cannot change your own role or deactivate your own account — that would leave the
        platform without an administrator.
      </p>
    </div>
  )
}
