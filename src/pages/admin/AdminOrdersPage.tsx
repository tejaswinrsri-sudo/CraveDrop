import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ChefHat,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Order, OrderStatus } from '../../types';
import { formatINR, ORDER_STATUS_TRANSITIONS } from '../../config/constants';
import toast from 'react-hot-toast';

export const AdminOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error } = useQuery<{
    orders: Order[];
    total: number;
  }>({
    queryKey: ['admin-orders', selectedStatus, searchQuery],
    queryFn: async () => {
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.get('/admin/orders', { params });
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await api.patch(`/admin/orders/${orderId}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Order status updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update order status');
    },
  });

  const orders = data?.orders || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Orders Dispatch</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track kitchen preparation, dispatch delivery drops, and manage transitions
          </p>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary shadow-xs"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLACED">Placed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-slate-500">Loading live orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-500">No orders match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Restaurant</th>
                  <th className="py-3.5 px-4">Customer &amp; Area</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Advance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.map((order) => {
                  const allowedNextStatuses =
                    ORDER_STATUS_TRANSITIONS[order.status] || [];

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 font-black text-slate-900">
                        #{order.orderNumber}
                        <p className="text-[10px] text-slate-400 font-normal">
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800">
                          {order.restaurant?.name || 'Restaurant'}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {order.restaurant?.area || ''}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800">{order.user?.name || 'Customer'}</p>
                        <p className="text-[11px] text-slate-500">
                          {order.deliveryAddress.area}, {order.deliveryAddress.phone}
                        </p>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="truncate text-slate-600">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-black text-slate-900">{formatINR(order.total)}</span>
                        <p className="text-[10px] text-slate-400 uppercase">
                          {order.paymentMethod} • {order.paymentStatus}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-orange-100 text-primary'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        {allowedNextStatuses.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Completed</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {allowedNextStatuses.map((nxtStatus: OrderStatus) => (
                              <button
                                key={nxtStatus}
                                type="button"
                                disabled={updateStatusMutation.isPending}
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    orderId: order._id,
                                    status: nxtStatus,
                                  })
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-xs ${
                                  nxtStatus === 'CANCELLED'
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-primary text-white hover:bg-primary-dark'
                                }`}
                              >
                                → {nxtStatus.replace(/_/g, ' ')}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
