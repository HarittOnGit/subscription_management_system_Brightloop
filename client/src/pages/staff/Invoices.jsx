import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import { inputClass } from '../../components/FormField';

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

export default function Invoices() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');

  const load = () => {
    const params = new URLSearchParams({ page });
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (overdue) params.append('overdue', 'true');
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    api(`/invoices?${params.toString()}`)
      .then(setData)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
  }, [page, search, status, overdue, from, to]);

  const runBilling = async () => {
    if (!confirm('Generate invoices for all due subscriptions?')) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await api('/billing/run', { method: 'POST', body: {} });
      setMsg(`Created ${r.invoicesCreated} invoices, skipped ${r.skipped} already billed`);
      setMsgType('success');
      load();
    } catch (e) {
      setMsg(e.message);
      setMsgType('error');
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">Invoices</h2>
        <button
          onClick={runBilling}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <Play size={16} /> {busy ? 'Running...' : 'Run Billing'}
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            msgType === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {msg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-sm">
        <input
          className={inputClass}
          placeholder="Search number, customer, sub..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className={inputClass}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => {
              setOverdue(e.target.checked);
              setPage(1);
            }}
          />
          Overdue only
        </label>

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

      {/* Invoices Table */}
      <Table
        page={data.page}
        pages={data.pages}
        onPage={setPage}
        rows={data.items}
        columns={[
          {
            label: 'Number',
            render: (r) => (
              <Link to={`/invoices/${r.id}`} className="font-semibold text-indigo-600 hover:underline">
                {r.number}
              </Link>
            ),
          },
          { label: 'Customer', render: (r) => r.customer?.name },
          { label: 'Subscription', render: (r) => r.subscription?.number || '-' },
          { label: 'Issue Date', render: (r) => r.issueDate?.slice(0, 10) },
          { label: 'Due Date', render: (r) => r.dueDate?.slice(0, 10) },
          { label: 'Total', render: (r) => money(r.total) },
          { label: 'Paid', render: (r) => money(r.amountPaid) },
          { label: 'Outstanding', render: (r) => money(r.outstanding) },
          {
            label: 'Status',
            render: (r) => <StatusBadge status={r.isOverdue ? 'OVERDUE' : r.status} />,
          },
          {
            label: '',
            render: (r) => (
              <Link to={`/invoices/${r.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                View &rarr;
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
