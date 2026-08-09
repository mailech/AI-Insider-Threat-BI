import Spinner from './Spinner'

/**
 * columns: [{ key, header, render?, className? }]
 * Wide tables scroll inside their own container so the page never scrolls
 * horizontally.
 */
export default function DataTable({
  columns,
  rows,
  loading,
  emptyMessage = 'Nothing to show yet.',
  onRowClick,
  rowKey = (row) => row.id,
}) {
  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    )
  }

  if (!rows.length) {
    return <p className="p-10 text-center text-sm text-ink-secondary">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-hairline/60 last:border-0 ${
                onRowClick ? 'cursor-pointer hover:bg-raised' : ''
              }`}
            >
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 ${column.className || ''}`}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
