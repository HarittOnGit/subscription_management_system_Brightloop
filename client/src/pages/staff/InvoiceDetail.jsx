import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Send, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    method: 'CARD',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const load = () => {
    api(`/invoices/${id}`)
      .then((data) => {
        setInv(data);
        setPayForm((prev) => ({
          ...prev,
          amount: data.outstanding > 0 ? String(data.outstanding) : '',
        }));
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [id]);

  const changeStatus = async (status) => {
    setActionError('');
    try {
      await api(`/invoices/${id}/status`, { method: 'PATCH', body: { status } });
      load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const sendInvoice = async () => {
    setActionError('');
    try {
      await api(`/invoices/${id}/send`, { method: 'POST', body: {} });
      load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    setActionError('');

    const amt = Number(payForm.amount);
    if (amt <= 0) return setActionError('Amount must be greater than 0');
    if (amt > Number(inv.outstanding)) return setActionError('Amount cannot exceed outstanding balance');

    try {
      await api('/payments', {
        method: 'POST',
        body: {
          invoiceId: id,
          method: payForm.method,
          amount: amt,
          date: payForm.date,
          note: payForm.note ? payForm.note.trim() : null,
        },
      });
      setPayModalOpen(false);
      load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (!inv) return <p className="text-slate-400 p-4">Loading invoice...</p>;

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-2 print:hidden cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to invoices
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{inv.number}</h2>
            <StatusBadge status={inv.isOverdue ? 'OVERDUE' : inv.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Customer: <strong className="text-slate-700">{inv.customer?.name}</strong> ({inv.customer?.email})</span>
            {inv.subscription && (
              <span>Subscription: <strong className="text-slate-700">{inv.subscription.number}</strong></span>
            )}
            <span>Issue: {inv.issueDate?.slice(0, 10)}</span>
            <span>Due: {inv.dueDate?.slice(0, 10)}</span>
            {inv.sentAt && <span className="text-emerald-700">Sent on {new Date(inv.sentAt).toLocaleDateString()}</span>}
          </div>
        </div>

        {/* Action Buttons (print:hidden) */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {inv.status === 'DRAFT' && (
            <>
              <button
                onClick={() => changeStatus('CONFIRMED')}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                <CheckCircle size={14} /> Confirm
              </button>
              <button
                onClick={() => changeStatus('CANCELLED')}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}

          {inv.status === 'CONFIRMED' && (
            <>
              <button
                onClick={() => setPayModalOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
              >
                <CreditCard size={14} /> Record Payment
              </button>
              <button
                onClick={sendInvoice}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Send size={14} /> Send
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer size={14} /> Print
              </button>
              <button
                disabled={Number(inv.amountPaid) > 0}
                onClick={() => changeStatus('CANCELLED')}
                className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </>
          )}

          {inv.status === 'PAID' && (
            <>
              <button
                onClick={sendInvoice}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Send size={14} /> Send
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                <Printer size={14} /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{actionError}</div>
      )}

      {/* Lines Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="mb-3 font-semibold text-slate-900 text-sm">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2.5">Description</th>
                <th className="p-2.5">Qty</th>
                <th className="p-2.5">Unit Price</th>
                <th className="p-2.5">Discount</th>
                <th className="p-2.5">Tax %</th>
                <th className="p-2.5">Tax</th>
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
                  <td className="p-2.5">{Number(line.taxPercent)}%</td>
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

      {/* Payments History Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="mb-3 font-semibold text-slate-900 text-sm">Payments History</h3>
        {inv.payments && inv.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Method</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-2">{p.date?.slice(0, 10)}</td>
                    <td className="p-2 font-medium">{p.method}</td>
                    <td className="p-2 font-semibold text-emerald-700">{money(p.amount)}</td>
                    <td className="p-2 text-slate-500">{p.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No payments recorded yet.</p>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal open={payModalOpen} title={`Record Payment for ${inv.number}`} onClose={() => setPayModalOpen(false)}>
        <form onSubmit={recordPayment} className="space-y-4">
          <FormField label="Payment Method">
            <select
              className={inputClass}
              value={payForm.method}
              onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
            >
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </FormField>

          <FormField label={`Amount (₹) — Max: ${money(inv.outstanding)}`}>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={inv.outstanding}
              className={inputClass}
              required
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            />
          </FormField>

          <FormField label="Payment Date">
            <input
              type="date"
              max={todayStr}
              className={inputClass}
              required
              value={payForm.date}
              onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
            />
          </FormField>

          <FormField label="Note (Optional, max 500 chars)">
            <textarea
              className={inputClass}
              maxLength={500}
              placeholder="e.g. Transaction ID, UPI reference, bank receipt"
              value={payForm.note}
              onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
            />
          </FormField>

          <button className="w-full rounded-lg bg-emerald-600 py-2 text-white font-medium hover:bg-emerald-700 cursor-pointer">
            Confirm Payment
          </button>
        </form>
      </Modal>
    </div>
  );
}
