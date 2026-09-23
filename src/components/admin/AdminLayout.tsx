import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  BarChart3,
  Package,
  Store,
  Utensils,
  CalendarCheck,
  Users,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/admin/orders', label: 'Live Orders', icon: Package },
  { to: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { to: '/admin/menu-items', label: 'Menu Catalog', icon: Utensils },
  { to: '/admin/bookings', label: 'Table Bookings', icon: CalendarCheck },
  { to: '/admin/users', label: 'User Roles', icon: Users },
];

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-8 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium mr-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Storefront</span>
          </Link>
          <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-xs font-black">
            CD
          </div>
          <span className="font-extrabold text-sm tracking-tight">
            Crave<span className="text-primary">Drop</span> Control Center
          </span>
          <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase rounded tracking-wider border border-amber-500/30">
            Admin
          </span>
        </div>
      </div>

      {/* Admin Nav Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 shadow-xs sticky top-0 z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-3.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    isActive
                      ? 'border-primary text-primary bg-orange-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Admin View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
