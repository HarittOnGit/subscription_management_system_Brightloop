import React from 'react';

export default function Table({ columns, rows, page, pages, onPage, empty = 'No records found' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            {columns.map((c, idx) => (
              <th key={c.label || c.key || idx} className="px-4 py-3 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, rIdx) => (
            <tr key={r.id || rIdx} className="border-t border-slate-100 hover:bg-slate-50/50">
              {columns.map((c, cIdx) => (
                <td key={c.label || c.key || cIdx} className="px-4 py-3">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="disabled:opacity-40 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="text-slate-600">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            className="disabled:opacity-40 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
