import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';

const empty = {
  name: '',
  type: 'PERCENT',
  value: '',
  minPurchase: '',
  minQuantity: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
  usageLimit: '',
  appliesTo: 'SUBSCRIPTION',
  productId: '',
};

export default function Discounts() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api(`/discounts?page=${page}&search=${encodeURIComponent(search)}`)
      .then(setData)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
  }, [page, search]);

  useEffect(() => {
    api('/products?limit=100').then((res) => setProducts(res.items || [])).catch(() => {});
  }, []);

  const openEdit = (d) => {
    setForm({
      ...d,
      startDate: d.startDate ? d.startDate.slice(0, 10) : '',
      endDate: d.endDate ? d.endDate.slice(0, 10) : '',
      minPurchase: d.minPurchase ?? '',
      minQuantity: d.minQuantity ?? '',
      usageLimit: d.usageLimit ?? '',
      productId: d.productId ?? '',
    });
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');

    if (form.endDate < form.startDate) {
      return setError('End date must not be before start date');
    }
    if (form.type === 'PERCENT' && Number(form.value) > 100) {
      return setError('Percentage cannot be greater than 100');
    }
    if (form.appliesTo === 'PRODUCT' && !form.productId) {
      return setError('Please select a specific product');
    }

    const payload = {
      name: form.name,
      type: form.type,
      value: Number(form.value),
      minPurchase: form.minPurchase ? Number(form.minPurchase) : null,
      minQuantity: form.minQuantity ? Number(form.minQuantity) : null,
      startDate: form.startDate,
      endDate: form.endDate,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      appliesTo: form.appliesTo,
      productId: form.appliesTo === 'PRODUCT' ? form.productId : null,
    };

    try {
      if (form.id) {
        await api(`/discounts/${form.id}`, { method: 'PUT', body: payload });
      } else {
        await api('/discounts', { method: 'POST', body: payload });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this discount?')) return;
    try {
      await api(`/discounts/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Discounts</h2>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Search discounts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            onClick={() => {
              setForm(empty);
              setError('');
            }}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={16} /> New Discount
          </button>
        </div>
      </div>

      <Table
        page={data.page}
        pages={data.pages}
        onPage={setPage}
        rows={data.items}
        columns={[
          { label: 'Name', key: 'name' },
          { label: 'Type', key: 'type' },
          {
            label: 'Value',
            render: (r) => (r.type === 'PERCENT' ? `${Number(r.value)}%` : `₹${Number(r.value).toFixed(2)}`),
          },
          {
            label: 'Applies to',
            render: (r) =>
              r.appliesTo === 'PRODUCT' ? `Product: ${r.product?.name || r.productId}` : 'Whole Subscription',
          },
          {
            label: 'Validity',
            render: (r) => `${r.startDate?.slice(0, 10)} to ${r.endDate?.slice(0, 10)}`,
          },
          {
            label: 'Used',
            render: (r) => `${r.timesUsed} / ${r.usageLimit != null ? r.usageLimit : '∞'}`,
          },
          {
            label: 'Status',
            render: (r) => {
              const now = new Date();
              const expired = new Date(r.endDate) < now;
              const usedUp = r.usageLimit != null && r.timesUsed >= r.usageLimit;
              if (expired) {
                return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs">Expired</span>;
              }
              if (usedUp) {
                return <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs">Used up</span>;
              }
              return <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Active</span>;
            },
          },
          {
            label: 'Actions',
            render: (r) => (
              <div className="flex items-center gap-3">
                <button className="text-indigo-600 hover:underline cursor-pointer" onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button className="text-red-600 hover:text-red-800 cursor-pointer" onClick={() => remove(r.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={!!form} title={form?.id ? 'Edit Discount' : 'New Discount'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <FormField label="Discount Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Discount Type">
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </FormField>
              <FormField label={form.type === 'PERCENT' ? 'Percentage Value (%)' : 'Amount (₹)'}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputClass}
                  required
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Min Purchase Amount (Optional)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.minPurchase}
                  onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                />
              </FormField>
              <FormField label="Min Quantity (Optional)">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.minQuantity}
                  onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date">
                <input
                  type="date"
                  className={inputClass}
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </FormField>
              <FormField label="End Date">
                <input
                  type="date"
                  className={inputClass}
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Usage Limit (Optional)">
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited if empty"
                  className={inputClass}
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                />
              </FormField>
              <FormField label="Applies To">
                <select
                  className={inputClass}
                  value={form.appliesTo}
                  onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
                >
                  <option value="SUBSCRIPTION">Whole Subscription</option>
                  <option value="PRODUCT">Specific Product</option>
                </select>
              </FormField>
            </div>

            {form.appliesTo === 'PRODUCT' && (
              <FormField label="Select Product">
                <select
                  className={inputClass}
                  required
                  value={form.productId || ''}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                >
                  <option value="">Choose a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="w-full mt-4 rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 cursor-pointer">
              Save Discount
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
