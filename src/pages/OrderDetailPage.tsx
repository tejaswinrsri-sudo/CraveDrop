import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PackageCheck,
  Clock,
  MapPin,
  CreditCard,
  ChefHat,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Phone,
} from 'lucide-react';
import { api } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { formatINR } from '../config/constants';
import { VegBadge } from '../components/common/VegBadge';
import toast from 'react-hot-toast';

const STATUS_STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'PLACED', label: 'Order Placed', icon: Clock },
  { status: 'CONFIRMED', label: 'Confirmed', icon: PackageCheck },
  { status: 'PREPARING', label: 'In Kitchen', icon: ChefHat },
  { status: 'OUT_FOR_DELIVERY', label: 'On The Way', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: order, isLoading, isError, error } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const st = query.state.data?.status;
      return st === 'DELIVERED' || st === 'CANCELLED' ? false : 5000; // poll every 5s if active
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.patch(`/orders/${id}/cancel`, { reason });
      return res.data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled successfully');
      setShowCancelModal(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel order');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
        <p className="text-sm font-semibold text-slate-500">Loading order details...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Order not found</h2>
        <p className="text-xs text-slate-500">{(error as any)?.message}</p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const canCancel = order.status === 'PLACED' || order.status === 'CONFIRMED';
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>

        {/* Order Header Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Order</span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                #{order.orderNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
              >
                Cancel Order
              </button>
            )}

            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                isCancelled
                  ? 'bg-rose-100 text-rose-800'
                  : order.status === 'DELIVERED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-orange-100 text-primary'
              }`}
            >
              {order.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Status Tracker */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">
            Live Delivery Status
          </h3>

          {isCancelled ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <p className="text-sm font-bold">This order was cancelled</p>
                {order.cancelledReason && (
                  <p className="text-xs text-rose-600 mt-0.5">
                    Reason: {order.cancelledReason}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-5 left-6 right-6 h-1 bg-slate-100 -z-0 hidden sm:block">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.max(0, (currentStepIdx / (STATUS_STEPS.length - 1)) * 100)}%`,
                  }}
                />
              </div>

              {/* Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="flex sm:flex-col items-center gap-3 text-left sm:text-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition ${
                          isCurrent
                            ? 'bg-primary text-white border-primary ring-4 ring-orange-100'
                            : isDone
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p
                          className={`text-xs font-bold leading-tight ${
                            isCurrent
                              ? 'text-primary'
                              : isDone
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Details & Receipt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Items card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Items Ordered
            </h3>

            <div className="divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <VegBadge isVeg={item.isVeg} size="sm" />
                    <span className="text-xs font-semibold text-slate-800">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">
                    <span>{item.quantity} × </span>
                    <span>{formatINR(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-semibold text-slate-800">
                  {order.deliveryFee === 0 ? 'FREE' : formatINR(order.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-semibold text-slate-800">{formatINR(order.tax)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>Total Amount</span>
                <span className="text-primary">{formatINR(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Delivery & Payment details card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Delivery Destination</span>
              </h3>
              <p className="text-xs font-semibold text-slate-800">{order.deliveryAddress.line1}</p>
              <p className="text-xs text-slate-500">
                {order.deliveryAddress.area}, Chennai - {order.deliveryAddress.pincode}
              </p>
              {order.deliveryAddress.phone && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{order.deliveryAddress.phone}</span>
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Payment Information</span>
              </h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-bold text-slate-800">
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-slate-500">Payment Status</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    order.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            {order.note && (
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Instructions / Notes
                </h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  &ldquo;{order.note}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Cancel this order?</h3>
              <p className="text-xs text-slate-500">
                Please let us know why you are cancelling this order:
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Ordered by mistake, delivery time too long, changed mind..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(cancelReason || 'Cancelled by customer')}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
