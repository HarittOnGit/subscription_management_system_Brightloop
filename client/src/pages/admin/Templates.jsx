import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';

const emptyLine = { productId: '', variantId: '', quantity: 1 };

export default function Templates() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api(`/templates?page=${page}&search=${encodeURIComponent(search)}`)
      .then(setData)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
  }, [page, search]);

  useEffect(() => {
    api('/plans?limit=100').then((res) => setPlans(res.items || [])).catch(() => {});
    api('/products?limit=100').then((res) => setProducts(res.items || [])).catch(() => {});
  }, []);

  const openNew = () => {
    setForm({
      name: '',
      planId: plans[0]?.id || '',
      validityDays: 30,
      lines: [{ ...emptyLine, productId: products[0]?.id || '' }],
    });
    setError('');
  };

  const openEdit = (tpl) => {
    setForm({
      id: tpl.id,
      name: tpl.name,
      planId: tpl.planId,
      validityDays: tpl.validityDays,
      lines: tpl.lines?.map((l) => ({
        productId: l.productId,
        variantId: l.variantId || '',
        quantity: l.quantity,
      })) || [],
    });
    setError('');
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...form.lines];
    updated[index][field] = value;
    if (field === 'productId') {
      updated[index].variantId = '';
    }
    setForm({ ...form, lines: updated });
  };

  const addLine = () => {
    setForm({
      ...form,
      lines: [...form.lines, { ...emptyLine, productId: products[0]?.id || '' }],
    });
  };

  const removeLine = (index) => {
    setForm({
      ...form,
      lines: form.lines.filter((_, i) => i !== index),
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.lines || form.lines.length === 0) {
      return setError('Add at least one product line');
    }

    const payload = {
      name: form.name,
      planId: form.planId,
      validityDays: Number(form.validityDays),
      lines: form.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId || null,
        quantity: Number(l.quantity) || 1,
      })),
    };

    try {
      if (form.id) {
        await api(`/templates/${form.id}`, { method: 'PUT', body: payload });
      } else {
        await api('/templates', { method: 'POST', body: payload });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api(`/templates/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Quotation Templates</h2>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Search templates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            onClick={openNew}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={16} /> New Template
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
          { label: 'Plan', render: (r) => r.plan?.name || r.planId },
          { label: 'Validity (days)', key: 'validityDays' },
          { label: 'No. of lines', render: (r) => r.lines?.length || 0 },
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

      <Modal open={!!form} title={form?.id ? 'Edit Template' : 'New Template'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <FormField label="Template Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Associated Plan">
                <select
                  className={inputClass}
                  required
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                >
                  <option value="">Select a plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{Number(p.price)})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Validity (Days)">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  required
                  value={form.validityDays}
                  onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
                />
              </FormField>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium text-slate-800 text-sm">Product Lines</h4>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  + Add line
                </button>
              </div>

              <div className="space-y-2">
                {form.lines.map((line, idx) => {
                  const selectedProduct = products.find((p) => p.id === line.productId);
                  const availableVariants = selectedProduct?.variants || [];
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                      <select
                        className="flex-1 rounded border border-slate-300 p-1.5 bg-white text-xs"
                        value={line.productId}
                        onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                        required
                      >
                        <option value="">Select product</option>
                        {products.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name}
                          </option>
                        ))}
                      </select>

                      <select
                        className="w-32 rounded border border-slate-300 p-1.5 bg-white text-xs"
                        value={line.variantId || ''}
                        onChange={(e) => handleLineChange(idx, 'variantId', e.target.value)}
                      >
                        <option value="">No variant</option>
                        {availableVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.attribute}: {v.value} (+₹{Number(v.extraPrice)})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        className="w-16 rounded border border-slate-300 p-1.5 bg-white text-xs"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 cursor-pointer">
              Save Template
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
