import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Badge, { EventBadge } from '../components/Badge'
import DataTable from '../components/DataTable'

const columns = [
  { key: 'full_name', header: 'Employee' },
  { key: 'employee_code', header: 'Code' },
]

describe('DataTable', () => {
  it('renders headers and rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[
          { id: 1, full_name: 'Asha Menon', employee_code: 'EMP001' },
          { id: 2, full_name: 'Rohan Iyer', employee_code: 'EMP002' },
        ]}
      />,
    )

    expect(screen.getByText('Employee')).toBeInTheDocument()
    expect(screen.getByText('Asha Menon')).toBeInTheDocument()
    expect(screen.getByText('EMP002')).toBeInTheDocument()
  })

  it('shows the empty message instead of an empty table', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="No employees found." />)
    expect(screen.getByText('No employees found.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a spinner while loading', () => {
    render(<DataTable columns={columns} rows={[]} loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('carries severity as a label, not only a color', () => {
    render(<EventBadge eventType="PRIVILEGE_CHANGE" />)
    expect(screen.getByText('Privilege Change')).toBeInTheDocument()
  })

  it('renders an icon alongside the text for every severity', () => {
    const { container } = render(<Badge severity="critical">Terminated</Badge>)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByText('Terminated')).toBeInTheDocument()
  })
})
