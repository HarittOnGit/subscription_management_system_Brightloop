import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  RefreshCw,
  FileText,
  CreditCard,
  Package,
  Layers,
  FileStack,
  Receipt,
  Percent,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { getUser } from '../routes/ProtectedRoute.jsx';

const MENU_ITEMS = {
  ADMIN: [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Subscriptions', to: '/subscriptions', icon: RefreshCw },
    { name: 'Invoices', to: '/invoices', icon: FileText },
    { name: 'Payments', to: '/payments', icon: CreditCard },
    { name: 'Products', to: '/products', icon: Package },
    { name: 'Plans', to: '/plans', icon: Layers },
    { name: 'Templates', to: '/templates', icon: FileStack },
    { name: 'Taxes', to: '/taxes', icon: Receipt },
    { name: 'Discounts', to: '/discounts', icon: Percent },
    { name: 'Staff Members', to: '/staff', icon: ShieldCheck },
  ],
  STAFF: [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Subscriptions', to: '/subscriptions', icon: RefreshCw },
    { name: 'Invoices', to: '/invoices', icon: FileText },
    { name: 'Payments', to: '/payments', icon: CreditCard },
  ],
  CUSTOMER: [
    { name: 'My Subscriptions', to: '/portal/subscriptions', icon: RefreshCw },
    { name: 'My Invoices', to: '/portal/invoices', icon: FileText },
  ],
};

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = getUser() || { name: 'Demo', role: 'ADMIN' };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const currentRole = (user.role || 'ADMIN').toUpperCase();
  const navItems = MENU_ITEMS[currentRole] || MENU_ITEMS.ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden print:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Dark Slate Left Sidebar (print:hidden) */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 print:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">Brightloop</span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Subscription Engine
              </span>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {currentRole === 'CUSTOMER' ? 'Customer Portal' : 'Management'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-300">System v1.0</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
              Connected
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header (print:hidden) */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-medium text-slate-500 hidden sm:block">
              Brightloop Workspace
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <span>{user.name || 'Demo'}</span>
              <span className="text-slate-400">·</span>
              <span className="text-indigo-600 tracking-wide">{currentRole}</span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Routed Content */}
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
