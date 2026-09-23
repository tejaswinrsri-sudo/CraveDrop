import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Plus, Trash2, MapPin, Check, X, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Restaurant } from '../../types';
import { CHENNAI_AREAS, ChennaiArea, formatINR } from '../../config/constants';
import toast from 'react-hot-toast';

export const AdminRestaurantsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New restaurant form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cuisines, setCuisines] = useState('South Indian, Biryani');
  const [area, setArea] = useState<ChennaiArea>('Ramapuram');
  const [line1, setLine1] = useState('');
  const [pincode, setPincode] = useState('600089');
  const [deliveryTime, setDeliveryTime] = useState(30);
  const [minOrder, setMinOrder] = useState(150);
  const [costForTwo, setCostForTwo] = useState(400);
  const [tableCapacity, setTableCapacity] = useState(40);
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [image, setImage] = useState(
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80'
  );

  const { data, isLoading } = useQuery<{
    items: Restaurant[];
    total: number;
  }>({
    queryKey: ['admin-restaurants', selectedArea, search],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (selectedArea !== 'All') params.area = selectedArea;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/restaurants', { params });
      return res.data.data;
    },
  });

  const toggleOpenMutation = useMutation({
    mutationFn: async ({ id, isOpen }: { id: string; isOpen: boolean }) => {
      const res = await api.put(`/admin/restaurants/${id}`, { isOpen });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant status updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update status');
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/admin/restaurants', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('New restaurant added successfully');
      setShowAddModal(false);
      setName('');
      setDescription('');
      setLine1('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create restaurant');
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/restaurants/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete');
    },
  });

  const handleCreateRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    createRestaurantMutation.mutate({
      name,
      description,
      cuisines: cuisines.split(',').map((c) => c.trim()).filter(Boolean),
      image,
      area,
      address: {
        line1: line1 || 'Main Road',
        area,
        city: 'Chennai',
        pincode,
      },
      deliveryTime,
      minOrder,
      costForTwo,
      tableCapacity,
      isVegOnly,
      isOpen: true,
    });
  };

  const restaurants = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Chennai Kitchens Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage 55+ partner restaurants, opening states, and dine-in capacities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Restaurant</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search restaurant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-2 font-bold text-slate-800"
            >
              <option value="All">All Chennai Areas</option>
              {CHENNAI_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {restaurants.length} restaurants
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-slate-500">Loading restaurants...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Restaurant</th>
                  <th className="py-3.5 px-4">Area &amp; Pincode</th>
                  <th className="py-3.5 px-4">Cuisines</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Cost / 2</th>
                  <th className="py-3.5 px-4">Table Seats</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {restaurants.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.image}
                          alt={r.name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 bg-slate-100"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{r.name}</p>
                          {r.isVegOnly && (
                            <span className="text-[10px] text-emerald-700 font-bold">Pure Veg</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{r.area}</span>
                      <p className="text-[11px] text-slate-400">{r.address.pincode}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500">
                      {r.cuisines.join(', ')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">★ {r.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400"> ({r.ratingCount})</span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {formatINR(r.costForTwo)}
                    </td>

                    <td className="py-3.5 px-4 text-emerald-700 font-bold">
                      {r.tableCapacity} seats
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleOpenMutation.mutate({ id: r._id, isOpen: !r.isOpen })
                        }
                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                          r.isOpen
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {r.isOpen ? 'Open' : 'Closed'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete ${r.name}?`)) {
                            deleteRestaurantMutation.mutate(r._id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition"
                        title="Delete Restaurant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Add New Partner Restaurant</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saravana Mess"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Authentic Chennai delights..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cuisines (Comma Separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={cuisines}
                    onChange={(e) => setCuisines(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chennai Area
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value as ChennaiArea)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {CHENNAI_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="12 Main Rd"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Delivery (Mins)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(parseInt(e.target.value) || 30)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cost for Two (₹)
                  </label>
                  <input
                    type="number"
                    min="50"
                    value={costForTwo}
                    onChange={(e) => setCostForTwo(parseInt(e.target.value) || 300)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Table Seats
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={tableCapacity}
                    onChange={(e) => setTableCapacity(parseInt(e.target.value) || 40)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  required
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isVegOnly}
                  onChange={(e) => setIsVegOnly(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="font-bold text-emerald-800">Pure Vegetarian Kitchen Only</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRestaurantMutation.isPending}
                  className="px-5 py-2 font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs"
                >
                  {createRestaurantMutation.isPending ? 'Saving...' : 'Add Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
