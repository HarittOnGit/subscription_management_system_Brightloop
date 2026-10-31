import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { api } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

export default function MyInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/me/invoices/${id}`)
      .then(setInv)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (!inv) return <p className="text-slate-400 p-4">Loading invoice...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/portal/invoices')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-2 print:hidden cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to my invoices
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{inv.number}</h2>
            <StatusBadge status={inv.isOverdue ? 'OVERDUE' : inv.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
            {inv.subscription && <span>Subscription: {inv.subscription.number}</span>}
            <span>Issue Date: {inv.issueDate?.slice(0, 10)}</span>
            <span>Due Date: {inv.dueDate?.slice(0, 10)}</span>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 print:hidden cursor-pointer shadow-xs"
        >
          <Printer size={14} /> Print Invoice
        </button>
      </div>

      {/* Lines Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="mb-3 font-semibold text-slate-900 text-sm">Invoice Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2.5">Description</th>
                <th className="p-2.5">Quantity</th>
                <th className="p-2.5">Unit Price</th>
                <th className="p-2.5">Discount</th>
                <th className="p-2.5">Tax ({Number(inv.lines?.[0]?.taxPercent || 0)}%)</th>
                <th className="p-2.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines?.map((line) => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="p-2.5 font-medium text-slate-800">{line.description}</td>
                  <td className="p-2.5">{line.quantity}</td>
                  <td className="p-2.5">{money(line.unitPrice)}</td>
                  <td className="p-2.5 text-emerald-600">-{money(line.discountAmount)}</td>
                  <td className="p-2.5">{money(line.taxAmount)}</td>
                  <td className="p-2.5 text-right font-semibold">{money(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Box */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <div className="w-72 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{money(inv.subtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Total Discount:</span>
              <span>-{money(inv.discountTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax Total:</span>
              <span>+{money(inv.taxTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total:</span>
              <span>{money(inv.total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Amount Paid:</span>
              <span>{money(inv.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-indigo-700 pt-1 border-t border-slate-200">
              <span>Outstanding:</span>
              <span>{money(inv.outstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments History */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="mb-3 font-semibold text-slate-900 text-sm">Payment Receipts</h3>
        {inv.payments && inv.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Method</th>
                  <th className="p-2 font-semibold">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-2">{p.date?.slice(0, 10)}</td>
                    <td className="p-2 font-medium">{p.method}</td>
                    <td className="p-2 font-semibold text-emerald-700">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No payment records found.</p>
        )}
      </div>
    </div>
  );
}
