import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { homeFor } from '../../routes/ProtectedRoute';
import { isEmail } from '../../utils/validators';
import FormField, { inputClass } from '../../components/FormField';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isEmail(form.email)) return setError('Enter a valid email address');
    if (!form.password) return setError('Password is required');
    setBusy(true);
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: form });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-indigo-600">Brightloop</h1>
        <p className="mb-5 text-sm text-slate-500">Log in to your account</p>
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
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-indigo-600 hover:underline">
            Forgot password?
          </Link>
          <Link to="/register" className="text-indigo-600 hover:underline">
            Create account
          </Link>
        </div>
      </form>
    </div>
  );
}
