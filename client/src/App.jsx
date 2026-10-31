import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute, { getUser, homeFor } from './routes/ProtectedRoute.jsx';

// Auth Pages (Person 1)
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';

// Catalog Pages (Person 2)
import Products from './pages/admin/Products.jsx';
import Plans from './pages/admin/Plans.jsx';
import Templates from './pages/admin/Templates.jsx';

// Subscription, Taxes, Discounts Pages (Person 3)
import Taxes from './pages/admin/Taxes.jsx';
import Discounts from './pages/admin/Discounts.jsx';
import Subscriptions from './pages/staff/Subscriptions.jsx';
import SubscriptionDetail from './pages/staff/SubscriptionDetail.jsx';

// Billing, Invoices, Payments, Dashboard Pages (Person 4)
import Invoices from './pages/staff/Invoices.jsx';
import InvoiceDetail from './pages/staff/InvoiceDetail.jsx';
import Payments from './pages/staff/Payments.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';

// User & Portal Pages (Person 1)
import Staff from './pages/admin/Staff.jsx';
import Customers from './pages/staff/Customers.jsx';
import MySubscriptions from './pages/portal/MySubscriptions.jsx';
import MyInvoices from './pages/portal/MyInvoices.jsx';
import MyInvoiceDetail from './pages/portal/MyInvoiceDetail.jsx';

export default function App() {
  const user = getUser();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Authenticated Application Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Admin + Staff Shared Routes */}
            <Route element={<ProtectedRoute roles={['ADMIN', 'STAFF']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/subscriptions/new" element={<SubscriptionDetail />} />
              <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/payments" element={<Payments />} />
            </Route>

            {/* Admin Only Configuration & Catalog Routes */}
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/products" element={<Products />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/taxes" element={<Taxes />} />
              <Route path="/discounts" element={<Discounts />} />
              <Route path="/staff" element={<Staff />} />
            </Route>

            {/* Customer Self-Service Portal Routes */}
            <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
              <Route path="/portal/subscriptions" element={<MySubscriptions />} />
              <Route path="/portal/invoices" element={<MyInvoices />} />
              <Route path="/portal/invoices/:id" element={<MyInvoiceDetail />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
