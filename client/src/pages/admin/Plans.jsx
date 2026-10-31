import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';

const empty = {
  name: '',
  price: '',
  billingPeriod: 'MONTHLY',
  minQuantity: 1,
  availableFrom: new Date().toISOString().slice(0, 10),
  availableTo: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  autoClose: false,
  allowClose: true,
  allowPause: true,
  allowRenew: true,
};

export default function Plans() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api(`/plans?page=${page}&search=${encodeURIComponent(search)}`)
      .then(setData)
      .catch((err) => console.error(err));

  useEffect(() => {
    load();
  }, [page, search]);

  const save = async (e) => {
    e.preventDefault();
    setError('');

    if (form.availableTo < form.availableFrom) {
      return setError('End date must be after start date');
    }

    try {
      if (form.id) {
        await api(`/plans/${form.id}`, { method: 'PUT', body: form });
      } else {
        await api('/plans', { method: 'POST', body: form });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const closePlan = async (id) => {
    try {
      await api(`/plans/${id}/close`, { method: 'PATCH' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await api(`/plans/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (r) => {
    setForm({
      ...r,
      availableFrom: r.availableFrom ? r.availableFrom.slice(0, 10) : '',
      availableTo: r.availableTo ? r.availableTo.slice(0, 10) : '',
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Plans</h2>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            onClick={() => setForm(empty)}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={16} /> New Plan
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
          { label: 'Price', render: (r) => `₹${Number(r.price).toFixed(2)}` },
          { label: 'Billing Period', key: 'billingPeriod' },
          { label: 'Min Qty', key: 'minQuantity' },
          {
            label: 'Available Dates',
            render: (r) => `${r.availableFrom?.slice(0, 10)} to ${r.availableTo?.slice(0, 10)}`,
          },
          {
            label: 'Status',
            render: (r) => (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {r.isActive ? 'Active' : 'Closed'}
              </span>
            ),
          },
          {
            label: 'Actions',
            render: (r) => (
              <div className="flex items-center gap-3">
                {r.allowClose && r.isActive && (
                  <button
                    onClick={() => closePlan(r.id)}
                    className="text-amber-600 hover:text-amber-800 text-xs font-semibold cursor-pointer"
                  >
                    Close now
                  </button>
                )}
                <button className="text-indigo-600 hover:underline cursor-pointer" onClick={() => handleEdit(r)}>
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

      <Modal open={!!form} title={form?.id ? 'Edit Plan' : 'New Plan'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <FormField label="Plan Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </FormField>
              <FormField label="Billing Period">
                <select
                  className={inputClass}
                  value={form.billingPeriod}
                  onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </FormField>
            </div>

            <FormField label="Minimum Quantity">
              <input
                type="number"
                min="1"
                className={inputClass}
                required
                value={form.minQuantity}
                onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Available From">
                <input
                  type="date"
                  className={inputClass}
                  required
                  value={form.availableFrom}
                  onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                />
              </FormField>
              <FormField label="Available To">
                <input
                  type="date"
                  className={inputClass}
                  required
                  value={form.availableTo}
                  onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoClose}
                  onChange={(e) => setForm({ ...form, autoClose: e.target.checked })}
                />
                Auto-close at end date
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allowClose}
                  onChange={(e) => setForm({ ...form, allowClose: e.target.checked })}
                />
                Allow early close
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allowPause}
                  onChange={(e) => setForm({ ...form, allowPause: e.target.checked })}
                />
                Allow pause
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allowRenew}
                  onChange={(e) => setForm({ ...form, allowRenew: e.target.checked })}
                />
                Allow renew
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="w-full mt-4 rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 cursor-pointer">
              Save Plan
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
