import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';

const empty = { name: '', type: '', salesPrice: '', costPrice: '', notes: '' };

export default function Products() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = modal closed
  const [error, setError] = useState('');
  const [variant, setVariant] = useState({ attribute: '', value: '', extraPrice: '' });

  const load = () =>
    api(`/products?page=${page}&search=${encodeURIComponent(search)}`)
      .then(setData)
      .catch((err) => console.error(err));

  useEffect(() => {
    load();
  }, [page, search]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form.id) await api(`/products/${form.id}`, { method: 'PUT', body: form });
      else await api('/products', { method: 'POST', body: form });
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addVariant = async () => {
    try {
      await api(`/products/${form.id}/variants`, { method: 'POST', body: variant });
      setVariant({ attribute: '', value: '', extraPrice: '' });
      const fresh = await api(`/products/${form.id}`);
      setForm(fresh);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeVariant = async (variantId) => {
    try {
      await api(`/products/variants/${variantId}`, { method: 'DELETE' });
      const fresh = await api(`/products/${form.id}`);
      setForm(fresh);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Products</h2>
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
            <Plus size={16} /> New
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
          { label: 'Sales price', render: (r) => `₹${Number(r.salesPrice).toFixed(2)}` },
          { label: 'Cost price', render: (r) => `₹${Number(r.costPrice).toFixed(2)}` },
          { label: 'Variants', render: (r) => r.variants?.length || 0 },
          {
            label: '',
            render: (r) => (
              <div className="flex gap-3">
                <button className="text-indigo-600 hover:underline cursor-pointer" onClick={() => setForm(r)}>
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

      <Modal open={!!form} title={form?.id ? 'Edit product' : 'New product'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save}>
            <FormField label="Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Type">
              <input
                className={inputClass}
                required
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sales price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  required
                  value={form.salesPrice}
                  onChange={(e) => setForm({ ...form, salesPrice: e.target.value })}
                />
              </FormField>
              <FormField label="Cost price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  required
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea
                className={inputClass}
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormField>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <button className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 cursor-pointer">
              Save
            </button>

            {form.id && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <h4 className="mb-2 font-medium">Variants</h4>
                {form.variants?.map((v) => (
                  <div key={v.id} className="mb-1 flex items-center justify-between text-sm py-1 border-b border-slate-100">
                    <span>
                      {v.attribute}: {v.value} (+₹{Number(v.extraPrice)})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVariant(v.id)}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    className={inputClass}
                    placeholder="Brand"
                    value={variant.attribute}
                    onChange={(e) => setVariant({ ...variant, attribute: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Odoo"
                    value={variant.value}
                    onChange={(e) => setVariant({ ...variant, value: e.target.value })}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="560"
                    value={variant.extraPrice}
                    onChange={(e) => setVariant({ ...variant, extraPrice: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="mt-2 text-sm text-indigo-600 font-medium hover:underline cursor-pointer"
                >
                  + Add variant
                </button>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
