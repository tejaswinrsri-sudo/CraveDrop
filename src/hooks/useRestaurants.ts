import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Restaurant, MenuCategoryGroup } from '../types';

export interface RestaurantQueryParams {
  search?: string;
  cuisine?: string;
  veg?: boolean;
  area?: string;
  sort?: 'rating' | 'deliveryTime' | 'costForTwo';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useRestaurants(params: RestaurantQueryParams) {
  return useQuery<{
    items: Restaurant[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({
    queryKey: ['restaurants', params],
    queryFn: async () => {
      const cleanParams: Record<string, any> = {};
      if (params.search) cleanParams.search = params.search;
      if (params.cuisine && params.cuisine !== 'All') cleanParams.cuisine = params.cuisine;
      if (params.veg) cleanParams.veg = 'true';
      if (params.area && params.area !== 'All') cleanParams.area = params.area;
      if (params.sort) cleanParams.sort = params.sort;
      if (params.order) cleanParams.order = params.order;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;

      const res = await api.get('/restaurants', { params: cleanParams });
      return res.data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useRestaurantDetail(id: string | undefined) {
  return useQuery<{
    restaurant: Restaurant;
    categories: MenuCategoryGroup[];
  }>({
    queryKey: ['restaurant-menu', id],
    queryFn: async () => {
      if (!id) throw new Error('Restaurant ID required');
      const res = await api.get(`/restaurants/${id}/menu`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDistinctAreas() {
  return useQuery<string[]>({
    queryKey: ['distinct-areas'],
    queryFn: async () => {
      const res = await api.get('/restaurants/areas/list');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useDistinctCuisines() {
  return useQuery<string[]>({
    queryKey: ['distinct-cuisines'],
    queryFn: async () => {
      const res = await api.get('/restaurants/cuisines/list');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 30,
  });
}
