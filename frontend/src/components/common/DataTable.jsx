import React from 'react';
import { Inbox, Loader2 } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'Get started by creating your first entry.',
  keyField = 'id',
}) {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm text-slate-700">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {columns.map((col, index) => (
                <th
                  key={col.key || index}
                  className={`py-3.5 px-4 ${col.className || ''} ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                  style={{ width: col.width || 'auto' }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, rIndex) => (
                <tr key={`skeleton-${rIndex}`} className="animate-pulse">
                  {columns.map((col, cIndex) => (
                    <td key={`s-col-${cIndex}`} className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-base font-semibold text-slate-800">{emptyMessage}</p>
                    <p className="text-xs text-slate-500 mt-1">{emptySubtext}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Real Data Rows
              data.map((row, rIndex) => (
                <tr
                  key={row[keyField] || row._id || rIndex}
                  className="hover:bg-slate-50/70 transition-colors duration-150"
                >
                  {columns.map((col, cIndex) => {
                    const value = col.accessor
                      ? typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : row[col.accessor]
                      : null;

                    return (
                      <td
                        key={`cell-${rIndex}-${cIndex}`}
                        className={`py-3 px-4 ${col.className || ''} ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(value, row, rIndex) : value ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
