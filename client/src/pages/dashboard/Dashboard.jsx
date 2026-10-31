import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Repeat, IndianRupee, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import { inputClass } from '../../components/FormField';

const money = (v) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const COLORS = {
  DRAFT: '#94a3b8',
  CONFIRMED: '#f59e0b',
  PAID: '#22c55e',
  CANCELLED: '#ef4444',
};

function Kpi({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${tone}`}>
        <Icon size={18} />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    const q = new URLSearchParams(Object.entries(range).filter(([, v]) => v)).toString();
    api(`/dashboard/summary?${q}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api('/invoices?overdue=true&limit=5')
      .then((r) => setOverdue(r.items || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [range]);

  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (!data) return <p className="text-slate-400 p-4">Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">Finance Dashboard</h2>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            className={inputClass}
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            className={inputClass}
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Repeat}
          tone="bg-indigo-100 text-indigo-600"
          label="Active subscriptions"
          value={data.activeSubscriptions}
        />
        <Kpi
          icon={IndianRupee}
          tone="bg-green-100 text-green-600"
          label="Revenue collected"
          value={money(data.revenueCollected)}
          sub={`Total invoiced: ${money(data.totalInvoiced)}`}
        />
        <Kpi
          icon={Clock}
          tone="bg-amber-100 text-amber-600"
          label="Outstanding"
          value={money(data.outstanding?.amount)}
          sub={`${data.outstanding?.count || 0} unpaid invoices`}
        />
        <Kpi
          icon={AlertTriangle}
          tone="bg-red-100 text-red-600"
          label="Overdue"
          value={money(data.overdue?.amount)}
          sub={`${data.overdue?.count || 0} overdue invoices`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-2">
          <h3 className="mb-3 font-medium text-slate-900">Invoiced vs collected, by month</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} stroke="#94a3b8" />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Bar dataKey="invoiced" name="Invoiced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="mb-3 font-medium text-slate-900">Invoices by status</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byStatus} dataKey="count" nameKey="status" outerRadius={80} label>
                  {data.byStatus.map((s) => (
                    <Cell key={s.status} fill={COLORS[s.status] || '#cbd5e1'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Overdue invoices (chase these first)</h3>
        <Table
          rows={overdue}
          page={1}
          pages={1}
          empty="Nothing overdue 🎉"
          columns={[
            {
              label: 'Invoice',
              render: (r) => (
                <Link to={`/invoices/${r.id}`} className="font-semibold text-indigo-600 hover:underline">
                  {r.number}
                </Link>
              ),
            },
            { label: 'Customer', render: (r) => r.customer?.name },
            { label: 'Due', render: (r) => r.dueDate?.slice(0, 10) },
            { label: 'Outstanding', render: (r) => money(r.outstanding) },
            { label: 'Status', render: () => <StatusBadge status="OVERDUE" /> },
          ]}
        />
      </div>
    </div>
  );
}
