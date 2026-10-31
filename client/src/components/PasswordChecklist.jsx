import React from 'react';
import { Check, X } from 'lucide-react';
import { passwordRules } from '../utils/validators';

export default function PasswordChecklist({ password }) {
  return (
    <ul className="mb-3 space-y-1 text-xs">
      {passwordRules.map(([label, test]) => {
        const ok = test(password || '');
        return (
          <li key={label} className={`flex items-center gap-1 ${ok ? 'text-green-600' : 'text-slate-400'}`}>
            {ok ? <Check size={14} /> : <X size={14} />} {label}
          </li>
        );
      })}
    </ul>
  );
}
