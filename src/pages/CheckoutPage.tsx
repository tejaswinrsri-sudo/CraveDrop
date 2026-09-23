import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  CreditCard,
  Banknote,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../hooks/useCart';
import { formatINR, CHENNAI_AREAS, ChennaiArea } from '../config/constants';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { VegBadge } from '../components/common/VegBadge';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, isLoading: isCartLoading, clearCart } = useCart();

  // Fetch user profile to get saved addresses
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data;
    },
  });

  const savedAddresses = userProfile?.addresses || [];
  const defaultAddress = savedAddresses.find((a: any) => a.isDefault) || savedAddresses[0];

  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddress?._id || '');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(savedAddresses.length === 0);

  // New address form state
  const [newLabel, setNewLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newLine1, setNewLine1] = useState('');
  const [newArea, setNewArea] = useState<ChennaiArea>('Ramapuram');
  const [newPincode, setNewPincode] = useState('600089');
  const [newPhone, setNewPhone] = useState(userProfile?.phone || '');
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);

  // Payment and notes
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update selected address when user profile loads if not set yet
  React.useEffect(() => {
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress._id);
    }
  }, [defaultAddress, selectedAddressId]);

  if (isCartLoading || isProfileLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
        <p className="text-sm font-semibold text-slate-500">Preparing checkout...</p>
      </div>
    );
  }

  const items = cart?.items || [];
  const restaurant = cart?.restaurant;

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Your cart is empty</h2>
        <p className="text-xs text-slate-500">
          You don&apos;t have any items in your cart to checkout.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-primary rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Restaurants</span>
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const payload: any = {
        paymentMethod,
        note: orderNote,
      };

      if (!isAddingNewAddress && selectedAddressId) {
        payload.addressId = selectedAddressId;
      } else {
        if (!newLine1.trim()) {
          toast.error('Please enter your street address');
          setIsSubmitting(false);
          return;
        }
        if (!/^[6]\d{5}$/.test(newPincode.trim())) {
          toast.error('Please enter a valid 6-digit Chennai pincode starting with 6');
          setIsSubmitting(false);
          return;
        }

        payload.deliveryAddress = {
          line1: newLine1.trim(),
          area: newArea,
          city: 'Chennai',
          pincode: newPincode.trim(),
          phone: newPhone.trim() || '9876543210',
        };

        // Optionally save to user's saved addresses
        if (saveAddressToProfile) {
          try {
            await api.post('/users/me/addresses', {
              label: newLabel,
              line1: newLine1.trim(),
              area: newArea,
              city: 'Chennai',
              pincode: newPincode.trim(),
              isDefault: savedAddresses.length === 0,
            });
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
          } catch (addrErr) {
            console.warn('Failed to save address to profile:', addrErr);
          }
        }
      }

      const res = await api.post('/orders', payload);
      const order = res.data.data;

      // Invalidate cart and orders queries
      queryClient.setQueryData(['cart'], null);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success('Order placed successfully!');
      navigate(`/orders/${order._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to={restaurant ? `/restaurant/${restaurant._id}` : '/'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Restaurant</span>
        </Link>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-8">
          Secure Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: Address & Payment */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Delivery Address Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 min-w-0">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <span className="truncate">1. Delivery Address (Chennai)</span>
                </h3>

                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                    className="text-xs font-bold text-primary hover:text-primary-dark shrink-0 whitespace-nowrap"
                  >
                    {isAddingNewAddress ? 'Use Saved Address' : '+ Add New'}
                  </button>
                )}
              </div>

              {!isAddingNewAddress && savedAddresses.length > 0 ? (
                <div className="space-y-3">
                  {savedAddresses.map((addr: any) => (
                    <label
                      key={addr._id}
                      className={`block p-4 rounded-2xl border cursor-pointer transition ${
                        selectedAddressId === addr._id
                          ? 'border-primary bg-orange-50/40 ring-1 ring-primary'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={selectedAddressId === addr._id}
                          onChange={() => setSelectedAddressId(addr._id)}
                          className="mt-1 text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                              {addr.label}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-primary bg-orange-100 px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mt-1 truncate">
                            {addr.line1}
                          </p>
                          <p className="text-xs text-slate-500">
                            {addr.area}, Chennai - {addr.pincode}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                /* New Address Form */
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3">
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewLabel(lbl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          newLabel === lbl
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Street Address &amp; Flat / Door No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 14/2 Mount Poonamallee High Road, Flat 3B"
                      value={newLine1}
                      onChange={(e) => setNewLine1(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Chennai Area
                      </label>
                      <select
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value as ChennaiArea)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                      >
                        {CHENNAI_AREAS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Pincode (Chennai 6xxxxx)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="600089"
                        value={newPincode}
                        onChange={(e) => setNewPincode(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Contact Phone for Delivery
                    </label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAddressToProfile}
                      onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-medium text-slate-600">
                      Save this address to my profile
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* 2. Order Notes */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>2. Delivery Instructions / Kitchen Notes</span>
              </h3>
              <textarea
                rows={2}
                placeholder="e.g. Leave package at gate, make spicy, extra chutney please..."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span>3. Payment Method</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-4 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    paymentMethod === 'ONLINE'
                      ? 'border-primary bg-orange-50/50 ring-1 ring-primary'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'ONLINE'}
                    onChange={() => setPaymentMethod('ONLINE')}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span>Online Payment</span>
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Instant simulated payment via UPI, Debit/Credit Card, or NetBanking.
                    </p>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    paymentMethod === 'COD'
                      ? 'border-primary bg-orange-50/50 ring-1 ring-primary'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Cash on Delivery (COD)</span>
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pay cash or UPI upon delivery at your doorstep.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Order Summary</h3>
                <p className="text-xs text-slate-500 truncate">
                  From {restaurant?.name} ({restaurant?.area})
                </p>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {items.map((i) => (
                  <div key={i.menuItemId} className="py-2.5 flex items-center justify-between gap-2 min-w-0">
                    {/* Name — takes all remaining space, truncates */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <VegBadge isVeg={i.isVeg} size="sm" />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {i.name}
                      </span>
                    </div>
                    {/* Price — never shrinks */}
                    <div className="text-xs text-slate-600 font-semibold shrink-0">
                      <span>{i.quantity} × </span>
                      <span>{formatINR(i.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Calculations — each row: label min-w-0, price shrink-0 */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">Item Subtotal</span>
                  <span className="font-semibold text-slate-900 shrink-0">{formatINR(cart?.subtotal || 0)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">Delivery Fee</span>
                  <div className="shrink-0">
                    {cart?.deliveryFee === 0 ? (
                      <span className="font-bold text-emerald-700">FREE</span>
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {formatINR(cart?.deliveryFee || 0)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">GST (5% Government Tax)</span>
                  <span className="font-semibold text-slate-900 shrink-0">{formatINR(cart?.tax || 0)}</span>
                </div>

                <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between gap-2 text-base font-black text-slate-900">
                  <span className="min-w-0">Grand Total</span>
                  <span className="text-primary shrink-0">{formatINR(cart?.total || 0)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="w-full py-4 text-sm font-black text-white bg-primary hover:bg-primary-dark rounded-2xl shadow-lg shadow-orange-500/25 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Placing Order...' : `Pay & Place Order • ${formatINR(cart?.total || 0)}`}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Safe &amp; Verified Chennai Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
