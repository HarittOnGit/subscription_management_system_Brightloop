import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

export default function MyInvoices() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = () => {
    api(`/me/invoices?page=${page}`)
      .then(setData)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [page]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const totalOutstanding = data.items.reduce((s, inv) => s + (Number(inv.outstanding) || 0), 0);
  const overdueCount = data.items.filter((inv) => inv.isOverdue).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Invoices</h2>
        <p className="text-sm text-slate-500 mt-1">Review your billing statements, receipts, and outstanding amounts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Outstanding</span>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{money(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue Invoices</span>
          <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      <Table
        page={data.page}
        pages={data.pages}
        onPage={setPage}
        rows={data.items}
        columns={[
          {
            label: 'Number',
            render: (r) => (
              <Link to={`/portal/invoices/${r.id}`} className="font-semibold text-indigo-600 hover:underline">
                {r.number}
              </Link>
            ),
          },
          { label: 'Issue Date', render: (r) => r.issueDate?.slice(0, 10) },
          { label: 'Due Date', render: (r) => r.dueDate?.slice(0, 10) },
          { label: 'Total', render: (r) => money(r.total) },
          { label: 'Outstanding', render: (r) => money(r.outstanding) },
          {
            label: 'Status',
            render: (r) => <StatusBadge status={r.isOverdue ? 'OVERDUE' : r.status} />,
          },
          {
            label: '',
            render: (r) => (
              <Link to={`/portal/invoices/${r.id}`} className="text-xs font-medium text-indigo-600 hover:underline">
                View &rarr;
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
