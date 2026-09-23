import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Users, Clock, Search, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { Booking } from '../../types';
import toast from 'react-hot-toast';

export const AdminBookingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const { data, isLoading } = useQuery<{
    bookings: Booking[];
    total: number;
  }>({
    queryKey: ['admin-bookings', statusFilter, dateFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const res = await api.get('/admin/bookings', { params });
      return res.data.data;
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'CONFIRMED' | 'CANCELLED' }) => {
      const res = await api.patch(`/admin/bookings/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Reservation status updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update reservation');
    },
  });

  const bookings = data?.bookings || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Table Reservations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer table seating requests across partner Chennai restaurants
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-slate-500">Loading reservations...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No reservations found</p>
            <p className="text-xs text-slate-500">No table bookings match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Restaurant</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Date &amp; Time Slot</th>
                  <th className="py-3.5 px-4">Guests</th>
                  <th className="py-3.5 px-4">Special Requests</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{b.restaurant?.name || 'Restaurant'}</p>
                      <p className="text-[11px] text-slate-400">{b.restaurant?.area}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{b.user?.name || 'Guest'}</p>
                      <p className="text-[11px] text-slate-400">
                        {b.user?.phone || b.user?.email || '-'}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">
                        {new Date(b.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <p className="text-[11px] text-primary font-semibold">{b.timeSlot}</p>
                    </td>

                    <td className="py-3.5 px-4 text-emerald-700 font-bold">
                      {b.guests} Guests
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500">
                      {b.note || '-'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {b.status === 'CONFIRMED' ? (
                        <button
                          type="button"
                          disabled={updateBookingMutation.isPending}
                          onClick={() =>
                            updateBookingMutation.mutate({ id: b._id, status: 'CANCELLED' })
                          }
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={updateBookingMutation.isPending}
                          onClick={() =>
                            updateBookingMutation.mutate({ id: b._id, status: 'CONFIRMED' })
                          }
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        >
                          Reinstate
                        </button>
                      )}
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
