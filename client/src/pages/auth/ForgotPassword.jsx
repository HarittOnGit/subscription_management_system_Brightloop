import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { isEmail } from '../../utils/validators';
import FormField, { inputClass } from '../../components/FormField';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isEmail(email)) return setError('Enter a valid email address');
    setBusy(true);
    try {
      const res = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      });
      setMessage(res.message || 'If that email is registered, a reset link has been sent.');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-indigo-600">Brightloop</h1>
        <p className="mb-5 text-sm text-slate-500">Reset your password</p>

        {message ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-indigo-50 p-4 text-sm text-indigo-800">
              {message}
            </div>
            <p className="text-xs text-slate-500">
              Check your terminal/console for the generated password reset link.
            </p>
            <div className="pt-2">
              <Link to="/login" className="block text-center text-sm font-medium text-indigo-600 hover:underline">
                Back to log in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <FormField label="Email address">
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {busy ? 'Sending link...' : 'Send reset link'}
            </button>
            <div className="mt-4 text-center text-sm">
              <Link to="/login" className="text-indigo-600 hover:underline">
                Back to log in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
