import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Users, MapPin, XCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { Booking } from '../types';
import toast from 'react-hot-toast';

export const MyBookingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<{
    bookings: Booking[];
    total: number;
  }>({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return {
        bookings: res.data.data,
        total: res.data.data.length,
      };
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch(`/bookings/${bookingId}/cancel`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Reservation cancelled');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel reservation');
    },
  });

  const bookings = data?.bookings || [];

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">My Table Reservations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your dine-in table bookings across Chennai restaurants
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-slate-500">Loading your reservations...</p>
          </div>
        ) : isError ? (
          <div className="bg-white rounded-3xl p-8 border border-rose-100 text-center">
            <p className="text-sm font-bold text-rose-600">Failed to load reservations</p>
            <p className="text-xs text-slate-500 mt-1">{(error as any)?.message}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No table bookings yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Planning to dine out? Reserve seats in advance at top-rated Chennai restaurants with zero reservation fees.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
            >
              <span>Find Restaurants</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isCancelled = booking.status === 'CANCELLED';
              const restaurant = booking.restaurant;
              const bookingDate = new Intl.DateTimeFormat('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }).format(new Date(booking.date));

              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {restaurant?.name || 'Chennai Restaurant'}
                      </h3>
                      {restaurant && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span>{restaurant.area}, Chennai</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                          isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {booking.status}
                      </span>

                      {!isCancelled && (
                        <button
                          type="button"
                          disabled={cancelMutation.isPending}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this reservation?')) {
                              cancelMutation.mutate(booking._id);
                            }
                          }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 hover:bg-rose-50 rounded-xl transition"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{bookingDate}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>Time: {booking.timeSlot}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>{booking.guests} Guests</span>
                    </div>
                  </div>

                  {booking.note && (
                    <div className="text-xs text-slate-500 bg-slate-50/70 p-3 rounded-xl">
                      <strong>Special Request:</strong> {booking.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
