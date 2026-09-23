/**
 * CraveDrop Constants & Configurations
 * Chennai-only Food Ordering & Table Booking
 */

export const TAX_RATE = 0.05; // 5% GST
export const DELIVERY_FEE = 40; // ₹40 delivery fee
export const FREE_DELIVERY_ABOVE = 500; // Free delivery above ₹500

export const ORDER_STATUS_FLOW = [
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export type OrderStatus = (typeof ORDER_STATUS_FLOW)[number] | 'CANCELLED';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const CHENNAI_AREAS = [
  'Ramapuram',
  'Mogappair',
  'Anna Nagar',
  'T. Nagar',
  'Velachery',
  'Adyar',
  'Besant Nagar',
  'Mylapore',
  'Porur',
  'Kilpauk',
  'Nungambakkam',
] as const;

export type ChennaiArea = (typeof CHENNAI_AREAS)[number];

export interface AreaCoordinate {
  name: ChennaiArea;
  lat: number;
  lng: number;
}

export const CHENNAI_AREA_COORDINATES: AreaCoordinate[] = [
  { name: 'Ramapuram', lat: 13.0388, lng: 80.1804 },
  { name: 'Mogappair', lat: 13.085, lng: 80.177 },
  { name: 'Anna Nagar', lat: 13.085, lng: 80.2101 },
  { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'Velachery', lat: 12.9756, lng: 80.2207 },
  { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
  { name: 'Besant Nagar', lat: 12.9988, lng: 80.2668 },
  { name: 'Mylapore', lat: 13.0339, lng: 80.2619 },
  { name: 'Porur', lat: 13.0381, lng: 80.1564 },
  { name: 'Kilpauk', lat: 13.0827, lng: 80.2437 },
  { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425 },
];

export const BOOKING_TIME_SLOTS = [
  '12:00',
  '13:00',
  '14:00',
  '19:00',
  '20:00',
  '21:00',
] as const;

export type BookingTimeSlot = (typeof BOOKING_TIME_SLOTS)[number];

export const CUISINES_LIST = [
  'South Indian',
  'Chettinad',
  'Biryani',
  'North Indian',
  'Chinese',
  'Mughlai',
  'Cafe & Desserts',
  'Seafood',
  'Street Food',
  'Pure Veg',
] as const;

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
