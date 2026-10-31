import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { api } from '../../api/client';
import StatusBadge, { Stepper } from '../../components/StatusBadge';
import FormField, { inputClass } from '../../components/FormField';

const NEXT = {
  DRAFT: ['QUOTATION', 'Send quotation'],
  QUOTATION: ['CONFIRMED', 'Confirm'],
  CONFIRMED: ['ACTIVE', 'Activate'],
  ACTIVE: ['CLOSED', 'Close subscription'],
};

const emptyLine = { productId: '', variantId: '', quantity: 1, unitPrice: 0, taxId: '' };

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [products, setProducts] = useState([]);
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    customerId: '',
    planId: '',
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    paymentTerms: 'NET_30',
    lines: [],
  });

  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load lookup options
  useEffect(() => {
    api('/plans?limit=100').then((res) => setPlans(res.items || [])).catch(() => {});
    api('/users?role=CUSTOMER&limit=100').then((res) => setCustomers(res.items || [])).catch(() => {});
    api('/taxes?limit=100').then((res) => setTaxes(res.items || [])).catch(() => {});
    api('/products?limit=100').then((res) => setProducts(res.items || [])).catch(() => {});
  }, []);

  const loadSubscription = () => {
    if (isNew) {
      setSub({ status: 'DRAFT', number: 'New Subscription' });
      setForm({
        customerId: '',
        planId: '',
        startDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        paymentTerms: 'NET_30',
        lines: [{ ...emptyLine }],
      });
      return;
    }

    api(`/subscriptions/${id}`)
      .then((data) => {
        setSub(data);
        setForm({
          customerId: data.customerId,
          planId: data.planId,
          startDate: data.startDate?.slice(0, 10) || '',
          expiryDate: data.expiryDate?.slice(0, 10) || '',
          paymentTerms: data.paymentTerms,
          lines: data.lines?.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || '',
            quantity: l.quantity,
            unitPrice: Number(l.unitPrice),
            taxId: l.taxId || '',
          })) || [],
        });

        // Load preview
        api(`/subscriptions/${id}/preview`)
          .then(setPreview)
          .catch(() => {});
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadSubscription();
  }, [id]);

  const handleProductChange = (index, productId) => {
    const p = products.find((x) => x.id === productId);
    const updated = [...form.lines];
    updated[index].productId = productId;
    updated[index].variantId = '';
    updated[index].unitPrice = p ? Number(p.salesPrice) : 0;
    setForm({ ...form, lines: updated });
  };

  const handleVariantChange = (index, variantId) => {
    const line = form.lines[index];
    const p = products.find((x) => x.id === line.productId);
    const v = p?.variants?.find((x) => x.id === variantId);
    const updated = [...form.lines];
    updated[index].variantId = variantId;
    updated[index].unitPrice = p ? Number(p.salesPrice) + Number(v?.extraPrice || 0) : 0;
    setForm({ ...form, lines: updated });
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...form.lines];
    updated[index][field] = value;
    setForm({ ...form, lines: updated });
  };

  const addLine = () => {
    setForm({
      ...form,
      lines: [...form.lines, { ...emptyLine }],
    });
  };

  const removeLine = (index) => {
    setForm({
      ...form,
      lines: form.lines.filter((_, i) => i !== index),
    });
  };

  const liveSubtotal = form.lines.reduce((acc, l) => acc + (Number(l.unitPrice) || 0) * (Number(l.quantity) || 0), 0);

  const saveSubscription = async (e) => {
    e.preventDefault();
    setError('');

    if (form.lines.length === 0) return setError('Add at least one line');
    for (const l of form.lines) {
      if (!l.productId) return setError('Every line must have a product');
      if (l.quantity < 1) return setError('Line quantity must be at least 1');
    }

    const selectedPlan = plans.find((p) => p.id === form.planId);
    const totalQty = form.lines.reduce((acc, l) => acc + Number(l.quantity), 0);
    if (selectedPlan && totalQty < selectedPlan.minQuantity) {
      return setError(`This plan needs a minimum quantity of ${selectedPlan.minQuantity}`);
    }

    setSaving(true);
    try {
      const payload = {
        customerId: form.customerId,
        planId: form.planId,
        startDate: form.startDate,
        expiryDate: form.expiryDate,
        paymentTerms: form.paymentTerms,
        lines: form.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxId: l.taxId || null,
        })),
      };

      if (isNew) {
        const created = await api('/subscriptions', { method: 'POST', body: payload });
        navigate(`/subscriptions/${created.id}`);
      } else {
        const updated = await api(`/subscriptions/${id}`, { method: 'PUT', body: payload });
        setSub(updated);
        api(`/subscriptions/${id}/preview`).then(setPreview).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const changeStatus = async (nextStatus) => {
    setActionError('');
    try {
      const updated = await api(`/subscriptions/${id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      setSub(updated);
      api(`/subscriptions/${id}/preview`).then(setPreview).catch(() => {});
    } catch (err) {
      setActionError(err.message);
    }
  };

  const isDraftOrNew = isNew || sub?.status === 'DRAFT';
  const nextAction = sub && NEXT[sub.status];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/subscriptions')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to subscriptions
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{sub?.number || 'Subscription'}</h2>
            {sub && <StatusBadge status={sub.status} />}
          </div>
          {sub && !isNew && (
            <div className="mt-3">
              <Stepper status={sub.status} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isNew && (
          <div className="flex items-center gap-2">
            {['DRAFT', 'QUOTATION', 'CONFIRMED'].includes(sub?.status) && (
              <button
                type="button"
                onClick={() => changeStatus('CLOSED')}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
              >
                Close / Cancel
              </button>
            )}

            {nextAction && (
              <button
                type="button"
                onClick={() => changeStatus(nextAction[0])}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
              >
                {nextAction[1]}
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{actionError}</div>
      )}

      {/* Subscription Form */}
      <form onSubmit={saveSubscription} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <FormField label="Customer">
            {isDraftOrNew ? (
              <select
                className={inputClass}
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-semibold text-slate-800 py-2">{sub?.customer?.name || sub?.customerId}</p>
            )}
          </FormField>

          <FormField label="Plan">
            {isDraftOrNew ? (
              <select
                className={inputClass}
                required
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
              >
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Min: {p.minQuantity})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-semibold text-slate-800 py-2">{sub?.plan?.name || sub?.planId}</p>
            )}
          </FormField>

          <FormField label="Start Date">
            {isDraftOrNew ? (
              <input
                type="date"
                className={inputClass}
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            ) : (
              <p className="text-sm text-slate-800 py-2">{form.startDate}</p>
            )}
          </FormField>

          <FormField label="Expiry Date">
            {isDraftOrNew ? (
              <input
                type="date"
                className={inputClass}
                required
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            ) : (
              <p className="text-sm text-slate-800 py-2">{form.expiryDate}</p>
            )}
          </FormField>

          <FormField label="Payment Terms">
            {isDraftOrNew ? (
              <select
                className={inputClass}
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="NET_15">Net 15</option>
                <option value="NET_30">Net 30</option>
                <option value="NET_60">Net 60</option>
              </select>
            ) : (
              <p className="text-sm text-slate-800 py-2">{form.paymentTerms}</p>
            )}
          </FormField>
        </div>

        {/* Lines Table */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Subscription Lines</h3>
            {isDraftOrNew && (
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add line
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2">Variant</th>
                  <th className="p-2 w-20">Quantity</th>
                  <th className="p-2 w-28">Unit Price (₹)</th>
                  <th className="p-2">Tax</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                  {isDraftOrNew && <th className="p-2 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => {
                  const product = products.find((p) => p.id === line.productId);
                  const variants = product?.variants || [];
                  const lineAmount = (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0);

                  return (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="p-2">
                        {isDraftOrNew ? (
                          <select
                            className="w-full rounded border border-slate-300 p-1 bg-white"
                            value={line.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            required
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{product?.name || line.productId}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isDraftOrNew ? (
                          <select
                            className="w-full rounded border border-slate-300 p-1 bg-white"
                            value={line.variantId || ''}
                            onChange={(e) => handleVariantChange(idx, e.target.value)}
                          >
                            <option value="">None</option>
                            {variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.attribute}: {v.value} (+₹{Number(v.extraPrice)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{line.variantId || 'None'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isDraftOrNew ? (
                          <input
                            type="number"
                            min="1"
                            className="w-full rounded border border-slate-300 p-1 bg-white"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            required
                          />
                        ) : (
                          <span>{line.quantity}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isDraftOrNew ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded border border-slate-300 p-1 bg-white"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                            required
                          />
                        ) : (
                          <span>₹{Number(line.unitPrice).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isDraftOrNew ? (
                          <select
                            className="w-full rounded border border-slate-300 p-1 bg-white"
                            value={line.taxId || ''}
                            onChange={(e) => handleLineChange(idx, 'taxId', e.target.value)}
                          >
                            <option value="">No tax</option>
                            {taxes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({Number(t.percentage)}%)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{taxes.find((t) => t.id === line.taxId)?.name || 'None'}</span>
                        )}
                      </td>
                      <td className="p-2 text-right font-semibold">₹{lineAmount.toFixed(2)}</td>
                      {isDraftOrNew && (
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end text-sm font-semibold text-slate-800">
            <span>Subtotal: ₹{liveSubtotal.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {isDraftOrNew && (
          <button
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
          >
            {saving ? 'Saving...' : isNew ? 'Create Subscription' : 'Update Subscription'}
          </button>
        )}
      </form>

      {/* Bottom Panel: Next Invoice Preview */}
      {!isNew && preview && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="font-semibold text-slate-900 text-base">Next Invoice Preview</h3>
          <p className="text-xs text-slate-500">
            Simulated invoice calculations computed live with active discounts and tax rules applied.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2">Description</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Unit Price</th>
                  <th className="p-2">Subtotal</th>
                  <th className="p-2">Discount</th>
                  <th className="p-2">Tax ({preview.lines?.[0]?.taxPercent || 0}%)</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines?.map((l, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2 font-medium">{l.description}</td>
                    <td className="p-2">{l.quantity}</td>
                    <td className="p-2">₹{Number(l.unitPrice).toFixed(2)}</td>
                    <td className="p-2">₹{Number(l.subtotal).toFixed(2)}</td>
                    <td className="p-2 text-emerald-600">-₹{Number(l.discountAmount).toFixed(2)}</td>
                    <td className="p-2">₹{Number(l.taxAmount).toFixed(2)}</td>
                    <td className="p-2 text-right font-semibold">₹{Number(l.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <div className="w-64 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{Number(preview.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Discount:</span>
                <span>-₹{Number(preview.discountTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Tax:</span>
                <span>+₹{Number(preview.taxTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Projected Total:</span>
                <span>₹{Number(preview.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
