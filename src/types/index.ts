import { ChennaiArea, OrderStatus, BookingTimeSlot } from '../config/constants';

export type { ChennaiArea, OrderStatus, BookingTimeSlot };

export interface Address {
  _id: string;
  label: 'Home' | 'Work' | 'Other';
  line1: string;
  line2?: string;
  area: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  phone?: string;
  imageUrl?: string;
  role: 'customer' | 'admin';
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description: string;
  cuisines: string[];
  image: string;
  area: ChennaiArea;
  address: {
    line1: string;
    area: string;
    city: string;
    pincode: string;
  };
  rating: number;
  ratingCount: number;
  isOpen: boolean;
  deliveryTime: number;
  minOrder: number;
  isVegOnly: boolean;
  costForTwo: number;
  tableCapacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  isBestseller: boolean;
}

export interface MenuCategoryGroup {
  _id: string;
  category: string;
  items: MenuItem[];
}

export interface CartPopulatedItem {
  menuItemId: string;
  name: string;
  price: number;
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  quantity: number;
  lineTotal: number;
}

export interface CartData {
  _id: string;
  restaurant: {
    _id: string;
    name: string;
    slug: string;
    image: string;
    area: string;
    minOrder: number;
    isOpen: boolean;
    deliveryTime: number;
  } | null;
  items: CartPopulatedItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  freeDeliveryThreshold: number;
  amountNeededForFreeDelivery: number;
}

export interface OrderItemSnapshot {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  restaurantId: string;
  restaurant?: Restaurant;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  deliveryAddress: {
    line1: string;
    area: string;
    city: string;
    pincode: string;
    phone: string;
  };
  paymentMethod: 'COD' | 'ONLINE';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    at: string;
  }[];
  note?: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  userId: string;
  restaurantId: string;
  restaurant?: Restaurant;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  date: string;
  timeSlot: BookingTimeSlot;
  guests: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  pendingBookings: number;
  ordersByStatus: Record<string, number>;
  ordersLast7Days: { date: string; orders: number; revenue: number }[];
  topRestaurants: { _id: string; name: string; area: string; orderCount: number; totalRevenue: number }[];
}
