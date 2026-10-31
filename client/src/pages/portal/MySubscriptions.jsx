import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';

export default function MySubscriptions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/me/subscriptions')
      .then((res) => setItems(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading your subscriptions...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center max-w-2xl mx-auto shadow-xs">
        <h3 className="text-base font-semibold text-slate-800">You have no subscriptions yet.</h3>
        <p className="mt-1 text-sm text-slate-500">
          When your account is subscribed to plans or services, they will appear right here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Subscriptions</h2>
        <p className="text-sm text-slate-500 mt-1">Review active and previous subscription services</p>
      </div>

      <div className="space-y-4">
        {items.map((sub) => (
          <div key={sub.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-lg font-bold text-slate-900 mr-3">{sub.number}</span>
                <StatusBadge status={sub.status} />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {sub.startDate?.slice(0, 10)} &rarr; {sub.expiryDate?.slice(0, 10)}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <div>
                <span className="text-xs text-slate-400 block font-medium">PLAN</span>
                <span className="font-semibold text-slate-900">{sub.plan?.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">BILLING CYCLE</span>
                <span className="font-semibold text-slate-900">{sub.plan?.billingPeriod}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">PAYMENT TERMS</span>
                <span className="font-semibold text-slate-900">{sub.paymentTerms}</span>
              </div>
            </div>

            {/* Lines table */}
            <div className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/50">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Variant</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sub.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="p-2.5 font-medium text-slate-800">{line.product?.name}</td>
                      <td className="p-2.5 text-slate-600">
                        {line.variant ? `${line.variant.attribute}: ${line.variant.value}` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-semibold">{line.quantity}</td>
                      <td className="p-2.5 text-right">₹{Number(line.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
