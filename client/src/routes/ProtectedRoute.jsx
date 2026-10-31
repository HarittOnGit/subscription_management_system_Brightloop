import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const homeFor = (role) => (role === 'CUSTOMER' ? '/portal/subscriptions' : '/dashboard');

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

export default function ProtectedRoute({ roles }) {
  const user = getUser();
  if (!localStorage.getItem('token') || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
