import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../lib/auth';
import {
  User as UserIcon,
  MapPin,
  Plus,
  Trash2,
  CheckCircle,
  Phone,
  Mail,
  Home,
  Briefcase,
  Building,
} from 'lucide-react';
import { api } from '../lib/api';
import { CHENNAI_AREAS, ChennaiArea } from '../config/constants';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [phoneInput, setPhoneInput] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // New Address State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [area, setArea] = useState<ChennaiArea>('Ramapuram');
  const [pincode, setPincode] = useState('600089');
  const [isDefault, setIsDefault] = useState(false);

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data;
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await api.patch('/users/me', { phone });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Phone number updated');
      setIsUpdatingPhone(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update phone');
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: async (addr: any) => {
      const res = await api.post('/users/me/addresses', addr);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Address added');
      setShowAddressForm(false);
      setLine1('');
      setLine2('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add address');
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const res = await api.delete(`/users/me/addresses/${addressId}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Address removed');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove address');
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const res = await api.patch(`/users/me/addresses/${addressId}/default`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Default address updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update default address');
    },
  });

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1.trim()) {
      toast.error('Address line 1 is required');
      return;
    }
    if (!/^[6]\d{5}$/.test(pincode.trim())) {
      toast.error('Please enter a valid 6-digit Chennai pincode starting with 6');
      return;
    }

    addAddressMutation.mutate({
      label,
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      area,
      city: 'Chennai',
      pincode: pincode.trim(),
      isDefault,
    });
  };

  const addresses = userProfile?.addresses || [];

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Account Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal profile and saved Chennai delivery locations
          </p>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-primary font-black text-xl shrink-0 overflow-hidden ring-4 ring-orange-50">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.fullName || 'CD')[0].toUpperCase()}</span>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">{user?.fullName || 'CraveDrop User'}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user?.primaryEmailAddress?.emailAddress}</span>
              </p>
              {userProfile?.role === 'admin' && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-md tracking-wider">
                  Admin Access
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary Phone Number (For Delivery Confirmation)
              </label>
              {isUpdatingPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => updatePhoneMutation.mutate(phoneInput)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-xl"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUpdatingPhone(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{userProfile?.phone || 'No phone added yet'}</span>
                </p>
              )}
            </div>

            {!isUpdatingPhone && (
              <button
                type="button"
                onClick={() => {
                  setPhoneInput(userProfile?.phone || '');
                  setIsUpdatingPhone(true);
                }}
                className="text-xs font-bold text-primary hover:text-primary-dark"
              >
                {userProfile?.phone ? 'Edit Phone' : '+ Add Phone Number'}
              </button>
            )}
          </div>
        </div>

        {/* Address Book Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Saved Delivery Addresses</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Conveniently select your frequent home, work, or campus spots across Chennai
              </p>
            </div>

            {!showAddressForm && (
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Address</span>
              </button>
            )}
          </div>

          {/* New Address Form Modal/Section */}
          {showAddressForm && (
            <form
              onSubmit={handleAddAddress}
              className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  New Chennai Address
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-2">
                {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setLabel(lbl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      label === lbl
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address &amp; Door No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10/4 Trunk Road, Block B"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chennai Neighborhood
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value as ChennaiArea)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
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
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="600089"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-slate-700">
                  Set as my default delivery address
                </span>
              </label>

              <button
                type="submit"
                disabled={addAddressMutation.isPending}
                className="w-full py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
              >
                {addAddressMutation.isPending ? 'Saving...' : 'Save Address'}
              </button>
            </form>
          )}

          {/* List of Saved Addresses */}
          {addresses.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No addresses saved yet. Click &quot;Add Address&quot; above to add your first delivery spot.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr: any) => (
                <div
                  key={addr._id}
                  className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                    addr.isDefault
                      ? 'border-primary/50 bg-orange-50/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {addr.label === 'Home' ? (
                          <Home className="w-4 h-4 text-primary" />
                        ) : addr.label === 'Work' ? (
                          <Briefcase className="w-4 h-4 text-primary" />
                        ) : (
                          <Building className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-xs font-bold text-slate-900">{addr.label}</span>
                      </div>

                      {addr.isDefault && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-slate-800 leading-snug">{addr.line1}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {addr.area}, Chennai - {addr.pincode}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        onClick={() => setDefaultAddressMutation.mutate(addr._id)}
                        className="text-primary hover:text-primary-dark font-semibold text-[11px]"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Primary delivery spot</span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this address?')) {
                          deleteAddressMutation.mutate(addr._id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete Address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
