import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { isEmail, isStrongPassword } from '../../utils/validators';
import FormField, { inputClass } from '../../components/FormField';
import PasswordChecklist from '../../components/PasswordChecklist';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters');
    if (!isEmail(form.email)) return setError('Enter a valid email address');
    if (!isStrongPassword(form.password)) return setError('Password does not meet the requirements');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');

    setBusy(true);
    try {
      const { token, user } = await api('/auth/register', {
        method: 'POST',
        body: { name: form.name.trim(), email: form.email.trim(), password: form.password },
      });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/portal/subscriptions', { replace: true });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-indigo-600">Brightloop</h1>
        <p className="mb-5 text-sm text-slate-500">Create your customer account</p>

        <FormField label="Full Name">
          <input
            type="text"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </FormField>

        <FormField label="Email">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </FormField>

        <FormField label="Password">
          <input
            type="password"
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </FormField>
        <PasswordChecklist password={form.password} />

        <FormField label="Confirm Password">
          <input
            type="password"
            className={inputClass}
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
          />
        </FormField>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {busy ? 'Creating account...' : 'Create account'}
        </button>

        <div className="mt-4 text-center text-sm">
          <span className="text-slate-500">Already have an account? </span>
          <Link to="/login" className="text-indigo-600 hover:underline">
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
}
