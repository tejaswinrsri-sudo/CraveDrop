import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Utensils, Plus, Trash2, Star, Check, X, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Restaurant, MenuItem } from '../../types';
import { formatINR } from '../../config/constants';
import { VegBadge } from '../../components/common/VegBadge';
import toast from 'react-hot-toast';

export const AdminMenuItemsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Menu Item State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(250);
  const [category, setCategory] = useState('Main Course');
  const [isVeg, setIsVeg] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [image, setImage] = useState(
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80'
  );

  // Fetch all restaurants to populate picker
  const { data: restData } = useQuery<{ items: Restaurant[] }>({
    queryKey: ['admin-restaurants-picker'],
    queryFn: async () => {
      const res = await api.get('/restaurants', { params: { limit: 100 } });
      return res.data.data;
    },
  });

  const restaurants = restData?.items || [];

  // Set default selected restaurant
  React.useEffect(() => {
    if (!selectedRestaurantId && restaurants.length > 0) {
      setSelectedRestaurantId(restaurants[0]._id);
    }
  }, [restaurants, selectedRestaurantId]);

  // Fetch menu for selected restaurant
  const { data: menuData, isLoading } = useQuery<{
    items: MenuItem[];
    total: number;
  }>({
    queryKey: ['admin-menu-items', selectedRestaurantId],
    queryFn: async () => {
      if (!selectedRestaurantId) return { items: [], total: 0 };
      const res = await api.get('/admin/menu-items', {
        params: { restaurantId: selectedRestaurantId, limit: 100 },
      });
      return res.data.data;
    },
    enabled: !!selectedRestaurantId,
  });

  const toggleAvailableMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const res = await api.put(`/admin/menu-items/${id}`, { isAvailable });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items', selectedRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu', selectedRestaurantId] });
      toast.success('Dish availability updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update availability');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/admin/menu-items', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items', selectedRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu', selectedRestaurantId] });
      toast.success('Dish added to menu');
      setShowAddModal(false);
      setName('');
      setDescription('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add dish');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/menu-items/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items', selectedRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu', selectedRestaurantId] });
      toast.success('Dish deleted from menu');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete dish');
    },
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    createItemMutation.mutate({
      restaurantId: selectedRestaurantId,
      name,
      description,
      price,
      category,
      isVeg,
      isBestseller,
      image,
      isAvailable: true,
    });
  };

  const menuItems = menuData?.items || [];
  const currentRestaurant = restaurants.find((r) => r._id === selectedRestaurantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Menu Catalog Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Toggle live dish availability, adjust prices, and add signature recipes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!selectedRestaurantId}
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Restaurant Selection Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Kitchen:
          </label>
          <select
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
          >
            {restaurants.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} ({r.area})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {menuItems.length} dishes in this menu
        </span>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-slate-500">Loading dishes...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Utensils className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No menu items found</p>
            <p className="text-xs text-slate-500">Add dishes to start taking food orders.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Dish</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Diet</th>
                  <th className="py-3.5 px-4">Bestseller</th>
                  <th className="py-3.5 px-4">Availability</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {menuItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 bg-slate-100"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.category}
                    </td>

                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {formatINR(item.price)}
                    </td>

                    <td className="py-3.5 px-4">
                      <VegBadge isVeg={item.isVeg} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      {item.isBestseller ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          Bestseller
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAvailableMutation.mutate({
                            id: item._id,
                            isAvailable: !item.isAvailable,
                          })
                        }
                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {item.isAvailable ? 'In Stock' : 'Sold Out'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete ${item.name}?`)) {
                            deleteItemMutation.mutate(item._id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition"
                        title="Delete Item"
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

      {/* Add Menu Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                Add Dish to {currentRestaurant?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dish Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chettinad Pepper Mutton"
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
                  placeholder="Freshly ground peppercorns and tender cut meat..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Biryani & Rice">Biryani &amp; Rice</option>
                    <option value="Breads">Breads</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 100)}
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

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVeg}
                    onChange={(e) => setIsVeg(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-emerald-800">Pure Veg</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-amber-800">Chef&apos;s Bestseller</span>
                </label>
              </div>

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
                  disabled={createItemMutation.isPending}
                  className="px-5 py-2 font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs"
                >
                  {createItemMutation.isPending ? 'Saving...' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
