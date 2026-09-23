import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ReceiptText, ArrowRight, Clock, ChefHat, CheckCircle2, XCircle, ShoppingBag } from 'lucide-react';
import { api } from '../lib/api';
import { Order } from '../types';
import { formatINR } from '../config/constants';

export const MyOrdersPage: React.FC = () => {
  const { data, isLoading, isError, error } = useQuery<{
    orders: Order[];
    total: number;
  }>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return {
        orders: res.data.data.items,
        total: res.data.data.total,
      };
    },
  });

  const orders = data?.orders || [];

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">My Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track live drops and review your past Chennai food orders
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-slate-500">Loading your orders...</p>
          </div>
        ) : isError ? (
          <div className="bg-white rounded-3xl p-8 border border-rose-100 text-center">
            <p className="text-sm font-bold text-rose-600">Failed to load orders</p>
            <p className="text-xs text-slate-500 mt-1">{(error as any)?.message}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
            <div className="w-16 h-16 bg-orange-50 text-primary rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No orders placed yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven&apos;t ordered any meals yet. Explore 55+ authentic Chennai kitchens and drop something delicious today!
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
            >
              <span>Explore Restaurants</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isDelivered = order.status === 'DELIVERED';
              const isCancelled = order.status === 'CANCELLED';

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-400">Order</span>{' '}
                      <span className="text-sm font-black text-slate-900">
                        #{order.orderNumber}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(order.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                          isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-orange-100 text-primary'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Summary of items */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Delivered to: {order.deliveryAddress.line1}, {order.deliveryAddress.area}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0">
                      <span className="text-sm font-black text-slate-900">
                        {formatINR(order.total)}
                      </span>

                      <Link
                        to={`/orders/${order._id}`}
                        className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-900 rounded-xl transition"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
