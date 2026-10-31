import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';

const empty = { name: '', percentage: '' };

export default function Taxes() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api(`/taxes?page=${page}&search=${encodeURIComponent(search)}`)
      .then(setData)
      .catch((err) => console.error(err));

  useEffect(() => {
    load();
  }, [page, search]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form.id) {
        await api(`/taxes/${form.id}`, { method: 'PUT', body: form });
      } else {
        await api('/taxes', { method: 'POST', body: form });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this tax?')) return;
    try {
      await api(`/taxes/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Taxes</h2>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Search taxes..."
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
            <Plus size={16} /> New Tax
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
          { label: 'Percentage', render: (r) => `${Number(r.percentage)}%` },
          {
            label: 'Actions',
            render: (r) => (
              <div className="flex items-center gap-3">
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

      <Modal open={!!form} title={form?.id ? 'Edit Tax' : 'New Tax'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <FormField label="Tax Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>

            <FormField label="Percentage (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputClass}
                required
                value={form.percentage}
                onChange={(e) => setForm({ ...form, percentage: e.target.value })}
              />
            </FormField>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="w-full mt-4 rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 cursor-pointer">
              Save Tax
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
