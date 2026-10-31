import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Table from '../../components/Table';
import { inputClass } from '../../components/FormField';

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

export default function Payments() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    const params = new URLSearchParams({ page });
    if (method) params.append('method', method);
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    api(`/payments?${params.toString()}`)
      .then(setData)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
  }, [page, method, from, to]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">Payments</h2>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-sm">
        <select
          className={inputClass}
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Methods</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CASH">Cash</option>
          <option value="CHEQUE">Cheque</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className={inputClass}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            className={inputClass}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Payments Table */}
      <Table
        page={data.page}
        pages={data.pages}
        onPage={setPage}
        rows={data.items}
        columns={[
          { label: 'Date', render: (r) => r.date?.slice(0, 10) },
          {
            label: 'Invoice',
            render: (r) => (
              <Link to={`/invoices/${r.invoice?.id}`} className="font-semibold text-indigo-600 hover:underline">
                {r.invoice?.number}
              </Link>
            ),
          },
          { label: 'Customer', render: (r) => r.invoice?.customer?.name || '-' },
          { label: 'Method', key: 'method' },
          { label: 'Amount', render: (r) => <span className="font-semibold text-emerald-700">{money(r.amount)}</span> },
          { label: 'Note', render: (r) => r.note || '-' },
        ]}
      />
    </div>
  );
}
