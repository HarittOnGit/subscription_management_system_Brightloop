import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';
import PasswordChecklist from '../../components/PasswordChecklist';
import { isEmail, isStrongPassword } from '../../utils/validators';

export default function Staff() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const load = () => {
    api(`/users?role=STAFF&page=${page}&search=${encodeURIComponent(search)}`)
      .then(setData)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
  }, [page, search]);

  const addStaff = async (e) => {
    e.preventDefault();
    setError('');

    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters');
    if (!isEmail(form.email)) return setError('Enter a valid email address');
    if (!isStrongPassword(form.password)) return setError('Password must meet complexity requirements');

    try {
      await api('/users/staff', {
        method: 'POST',
        body: form,
      });
      setModalOpen(false);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await api(`/users/staff/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">Staff Members</h2>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Search staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            onClick={() => {
              setForm({ name: '', email: '', password: '' });
              setError('');
              setModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={16} /> Add Staff
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
          { label: 'Email', key: 'email' },
          { label: 'Created', render: (r) => r.createdAt?.slice(0, 10) },
          {
            label: 'Actions',
            render: (r) => (
              <button
                className="text-red-600 hover:text-red-800 cursor-pointer"
                onClick={() => remove(r.id)}
                title="Delete staff member"
              >
                <Trash2 size={16} />
              </button>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} title="Add Staff Member" onClose={() => setModalOpen(false)}>
        <form onSubmit={addStaff} className="space-y-4">
          <FormField label="Full Name">
            <input
              className={inputClass}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>

          <FormField label="Email Address">
            <input
              type="email"
              className={inputClass}
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>

          <FormField label="Temporary Password">
            <input
              type="password"
              className={inputClass}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </FormField>
          <PasswordChecklist password={form.password} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 cursor-pointer">
            Create Staff Account
          </button>
        </form>
      </Modal>
    </div>
  );
}
