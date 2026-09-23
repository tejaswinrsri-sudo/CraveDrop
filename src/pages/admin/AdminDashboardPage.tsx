import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Package,
  CalendarCheck,
  Store,
  DollarSign,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../../lib/api';
import { AdminStats } from '../../types';
import { formatINR } from '../../config/constants';

export const AdminDashboardPage: React.FC = () => {
  const { data: stats, isLoading, isError, error } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
        <p className="text-xs text-slate-500">Loading admin analytics...</p>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center">
        <p className="text-sm font-bold text-rose-600">Failed to load admin stats</p>
        <p className="text-xs text-slate-500 mt-1">{(error as any)?.message}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Delivered Revenue',
      value: formatINR(stats.totalRevenue),
      subtext: 'Completed online & COD orders',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      subtext: 'Lifetime orders placed',
      icon: Package,
      color: 'text-primary bg-orange-50',
    },
    {
      label: 'Active Orders',
      value: stats.activeOrders.toLocaleString(),
      subtext: 'In kitchen or out for delivery',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Active Bookings',
      value: stats.pendingBookings.toLocaleString(),
      subtext: 'Upcoming table reservations',
      icon: CalendarCheck,
      color: 'text-indigo-600 bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Chennai Operations Overview
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time metrics, revenue performance, and delivery trends across 11 Chennai zones
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={`p-2 rounded-xl ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">{card.value}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Revenue Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                7-Day Revenue Trend
              </h3>
              <p className="text-xs text-slate-400">Daily gross revenue in INR</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.ordersLast7Days}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94A3B8"
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(val), 'Revenue']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#EA580C"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Order Volume */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                7-Day Order Volume
              </h3>
              <p className="text-xs text-slate-400">Total orders completed daily</p>
            </div>
            <Package className="w-4 h-4 text-primary" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ordersLast7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <Tooltip
                  formatter={(val: any) => [val, 'Orders']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="orders" fill="#0F172A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Restaurants */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Top Performing Chennai Kitchens
        </h3>

        {stats.topRestaurants.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No order volume data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 font-bold">Restaurant</th>
                  <th className="py-2.5 font-bold">Chennai Area</th>
                  <th className="py-2.5 font-bold">Orders</th>
                  <th className="py-2.5 font-bold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {stats.topRestaurants.map((r, i) => (
                  <tr key={r._id}>
                    <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                        {i + 1}
                      </span>
                      <span>{r.name}</span>
                    </td>
                    <td className="py-3 text-slate-500">{r.area}</td>
                    <td className="py-3 font-semibold">{r.orderCount} orders</td>
                    <td className="py-3 text-right font-black text-slate-900">
                      {formatINR(r.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
