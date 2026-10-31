import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Layout from './components/Layout.jsx';

// Generic placeholder page component
function PlaceholderPage({ title, description }) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {description || `Manage and view ${title.toLowerCase()} inside Brightloop.`}
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-lg mb-4">
          BL
        </div>
        <h3 className="text-base font-semibold text-slate-900">{title} Module Ready</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          This is the foundation route for {title}. Connect your React components, Recharts visualizations, and backend Express endpoints here.
        </p>
      </div>
    </div>
  );
}

// Login placeholder page
function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/30">
          ⚡
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">Brightloop</h2>
        <p className="mt-2 text-sm text-slate-400">Sign in to your subscription dashboard</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-700 text-center space-y-4">
          <p className="text-sm text-slate-300">
            Login placeholder route (<code className="text-indigo-400 font-mono">/login</code>).
          </p>
          <p className="text-xs text-slate-400">
            Authentication logic, JWT token storage, and credentials verification can be hooked into this view.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/30"
            >
              Continue to Dashboard Demo &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Shell Layout */}
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <PlaceholderPage
                title="Dashboard"
                description="High-level metrics, active MRR, churn analysis, and subscription activity."
              />
            }
          />
          <Route
            path="/customers"
            element={
              <PlaceholderPage
                title="Customers"
                description="Directory of subscriber accounts, payment methods, and user profiles."
              />
            }
          />
          <Route
            path="/subscriptions"
            element={
              <PlaceholderPage
                title="Subscriptions"
                description="Active recurring billing cycles, renewals, pause states, and cancellations."
              />
            }
          />
          <Route
            path="/invoices"
            element={
              <PlaceholderPage
                title="Invoices"
                description="Generated billing statements, payment terms, PDF receipts, and status flags."
              />
            }
          />
          <Route
            path="/payments"
            element={
              <PlaceholderPage
                title="Payments"
                description="Payment gateways, transactions, refunds, and dunning workflows."
              />
            }
          />
          <Route
            path="/products"
            element={
              <PlaceholderPage
                title="Products"
                description="Manage core products, feature tiers, and subscription offerings."
              />
            }
          />
          <Route
            path="/plans"
            element={
              <PlaceholderPage
                title="Plans"
                description="Configure billing frequencies, tiers, price points, and seat limits."
              />
            }
          />
          <Route
            path="/taxes"
            element={
              <PlaceholderPage
                title="Taxes"
                description="Jurisdiction tax rates, VAT/GST rules, and fiscal exempt policies."
              />
            }
          />
          <Route
            path="/discounts"
            element={
              <PlaceholderPage
                title="Discounts"
                description="Coupons, promotional codes, volume rebates, and trial periods."
              />
            }
          />
          <Route
            path="/staff"
            element={
              <PlaceholderPage
                title="Staff"
                description="Internal team members, RBAC permissions, and administrative access."
              />
            }
          />

          {/* Customer Portal Routes */}
          <Route
            path="/portal/subscriptions"
            element={
              <PlaceholderPage
                title="My Subscriptions"
                description="Self-service customer portal: view recurring services, upgrade, or pause."
              />
            }
          />
          <Route
            path="/portal/invoices"
            element={
              <PlaceholderPage
                title="My Invoices"
                description="Self-service customer portal: billing history and downloadable tax receipts."
              />
            }
          />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
