import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { isStrongPassword } from '../../utils/validators';
import FormField, { inputClass } from '../../components/FormField';
import PasswordChecklist from '../../components/PasswordChecklist';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-red-600 mb-2">Invalid Reset Link</h2>
          <p className="text-sm text-slate-500 mb-4">No password reset token was provided in the URL.</p>
          <Link to="/login" className="text-sm font-medium text-indigo-600 hover:underline">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isStrongPassword(password)) return setError('Password does not satisfy all requirements');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setBusy(true);
    try {
      const res = await api('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      setSuccess(res.message || 'Password updated successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-indigo-600">Brightloop</h1>
        <p className="mb-5 text-sm text-slate-500">Set a new password</p>

        {success ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        ) : (
          <form onSubmit={submit}>
            <FormField label="New Password">
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>
            <PasswordChecklist password={password} />

            <FormField label="Confirm New Password">
              <input
                type="password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormField>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <button
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {busy ? 'Updating...' : 'Update password'}
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
