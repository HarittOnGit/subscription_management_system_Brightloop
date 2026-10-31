import React from 'react';

const COLORS = {
  DRAFT: 'bg-slate-200 text-slate-700',
  QUOTATION: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

const STEPS = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'];

export function Stepper({ status }) {
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              i <= idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {s}
          </span>
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-slate-300" />}
        </div>
      ))}
    </div>
  );
}
