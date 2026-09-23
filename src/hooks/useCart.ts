import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { CartData } from '../types';
import { useCartStore } from '../lib/cartStore';

export function useCart() {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const { openConflictModal, openCartDrawer } = useCartStore();

  const cartQuery = useQuery<CartData>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/cart');
      return res.data.data;
    },
    enabled: !!isSignedIn,
    staleTime: 1000 * 30, // 30 seconds
  });

  const addItemMutation = useMutation({
    mutationFn: async ({
      menuItemId,
      quantity,
      replaceCart,
    }: {
      menuItemId: string;
      quantity: number;
      replaceCart?: boolean;
    }) => {
      const res = await api.post('/cart/items', { menuItemId, quantity, replaceCart });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data.data);
      toast.success(data.message || 'Added to cart');
      openCartDrawer();
    },
    onError: (error: any, variables) => {
      // Check if it's a DIFFERENT_RESTAURANT conflict
      if (error.message?.includes('another restaurant') || error.response?.data?.code === 'DIFFERENT_RESTAURANT') {
        const conflictData = error.response?.data?.data;
        openConflictModal({
          menuItemId: variables.menuItemId,
          quantity: variables.quantity,
          currentRestaurant: conflictData?.currentRestaurant,
          newRestaurant: conflictData?.newRestaurant,
        });
      } else {
        toast.error(error.message || 'Failed to add item to cart');
      }
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ menuItemId, quantity }: { menuItemId: string; quantity: number }) => {
      const res = await api.patch(`/cart/items/${menuItemId}`, { quantity });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update quantity');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (menuItemId: string) => {
      const res = await api.delete(`/cart/items/${menuItemId}`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      toast.success('Item removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove item');
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/cart');
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      toast.success('Cart cleared');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clear cart');
    },
  });

  const totalItemCount = cartQuery.data?.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    totalItemCount,
    addItem: addItemMutation.mutate,
    isAddingItem: addItemMutation.isPending,
    updateQuantity: updateQuantityMutation.mutate,
    removeItem: removeItemMutation.mutate,
    clearCart: clearCartMutation.mutate,
    refetch: cartQuery.refetch,
  };
}
