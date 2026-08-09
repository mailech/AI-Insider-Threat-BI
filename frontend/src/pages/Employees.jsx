import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { apiErrorMessage } from '../api/client'
import { departmentsApi, employeesApi } from '../api/resources'
import { useAuth } from '../auth/AuthContext'
import { StatusBadge } from '../components/Badge'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { EMPLOYEE_STATUSES, WRITE_ROLES } from '../lib/constants'
import { formatDate, humanise } from '../lib/format'

const EMPTY_FORM = {
  employee_code: '',
  full_name: '',
  email: '',
  designation: '',
  status: 'ACTIVE',
  department_id: '',
  joined_at: '',
}

const PAGE_SIZE = 20

export default function Employees() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canEdit = hasRole(WRITE_ROLES)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('')

  const [data, setData] = useState({ items: [], total: 0 })
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    employeesApi
      .list({
        page,
        page_size: PAGE_SIZE,
        q: search || undefined,
        department_id: departmentId || undefined,
        status: status || undefined,
      })
      .then((response) => {
        setData(response)
        setError('')
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load employees')))
      .finally(() => setLoading(false))
  }, [page, search, departmentId, status])

  useEffect(() => {
    departmentsApi.list().then(setDepartments).catch(() => setDepartments([]))
  }, [])

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(employee) {
    setEditing(employee)
    setForm({
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      email: employee.email,
      designation: employee.designation,
      status: employee.status,
      department_id: employee.department_id ?? '',
      joined_at: employee.joined_at ?? '',
    })
    setFormError('')
    setModalOpen(true)
  }

  async function onSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')

    const payload = {
      ...form,
      department_id: form.department_id === '' ? null : Number(form.department_id),
      joined_at: form.joined_at || null,
    }

    try {
      if (editing) {
        await employeesApi.update(editing.id, payload)
      } else {
        await employeesApi.create(payload)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save the employee'))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(employee) {
    if (!window.confirm(`Remove ${employee.full_name} and all of their monitored activity?`)) {
      return
    }
    try {
      await employeesApi.remove(employee.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not remove the employee'))
    }
  }

  const columns = [
    {
      key: 'full_name',
      header: 'Employee',
      render: (row) => (
        <div>
          <p className="font-medium">{row.full_name}</p>
          <p className="text-xs text-ink-muted">{row.email}</p>
        </div>
      ),
    },
    { key: 'employee_code', header: 'Code', className: 'tabular text-ink-secondary' },
    { key: 'designation', header: 'Designation', className: 'text-ink-secondary' },
    {
      key: 'department',
      header: 'Department',
      className: 'text-ink-secondary',
      render: (row) => row.department?.name || 'Unassigned',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'joined_at',
      header: 'Joined',
      className: 'tabular text-ink-secondary',
      render: (row) => formatDate(row.joined_at),
    },
  ]

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row)}>
            Edit
          </button>
          <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => onDelete(row)}>
            Remove
          </button>
        </div>
      ),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Employees</h1>
          <p className="text-sm text-ink-secondary">
            Identity, department mapping and asset association
          </p>
        </div>
        {canEdit ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            Onboard employee
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="field sm:max-w-xs"
          placeholder="Search name, email, code or designation"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <select
          className="field sm:max-w-[12rem]"
          value={departmentId}
          onChange={(event) => {
            setDepartmentId(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          className="field sm:max-w-[10rem]"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          {EMPLOYEE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="card text-sm text-critical">{error}</p> : null}

      <div className="card p-0">
        <DataTable
          columns={columns}
          rows={data.items}
          loading={loading}
          emptyMessage="No employees match these filters."
          onRowClick={(row) => navigate(`/employees/${row.id}`)}
        />
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit employee' : 'Onboard employee'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Employee code" required>
              <input
                className="field"
                value={form.employee_code}
                onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                required
              />
            </Field>
            <Field label="Full name" required>
              <input
                className="field"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className="field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Designation" required>
              <input
                className="field"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                required
              />
            </Field>
            <Field label="Department">
              <select
                className="field"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {EMPLOYEE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {humanise(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Joined on">
              <input
                type="date"
                className="field"
                value={form.joined_at || ''}
                onChange={(e) => setForm({ ...form, joined_at: e.target.value })}
              />
            </Field>
          </div>

          {formError ? <p className="text-xs text-critical">{formError}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-secondary">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}
