import { z } from 'zod';
import { CHENNAI_AREAS, BOOKING_TIME_SLOTS } from '../../src/config/constants';

/**
 * ============================================================================
 * JSDOC / TYPESCRIPT DATA SHAPES (NO ODM - NATIVE MONGODB DRIVER)
 * ============================================================================
 *
 * @typedef {Object} Address
 * @property {import('mongodb').ObjectId} _id
 * @property {'Home'|'Work'|'Other'} label
 * @property {string} line1
 * @property {string} [line2]
 * @property {string} area - One of CHENNAI_AREAS
 * @property {string} city - Default 'Chennai'
 * @property {string} pincode - 6 digits starting with 6
 * @property {boolean} isDefault
 *
 * @typedef {Object} UserDoc
 * @property {import('mongodb').ObjectId} _id
 * @property {string} clerkId - Unique
 * @property {string} [name]
 * @property {string} email - Unique lowercase
 * @property {string} [phone] - 10 digits starting with 6-9
 * @property {string} [imageUrl]
 * @property {'customer'|'admin'} role - Default 'customer'
 * @property {Address[]} addresses
 * @property {Date} createdAt
 * @property {Date} updatedAt
 *
 * @typedef {Object} RestaurantDoc
 * @property {import('mongodb').ObjectId} _id
 * @property {string} name - Max 100
 * @property {string} slug - Unique
 * @property {string} description - Max 500
 * @property {string[]} cuisines
 * @property {string} image - URL
 * @property {string} area - One of CHENNAI_AREAS
 * @property {{ line1: string, area: string, city: string, pincode: string }} address
 * @property {number} rating - 0 to 5
 * @property {number} ratingCount
 * @property {boolean} isOpen - Default true
 * @property {{ open: string, close: string }} openingHours
 * @property {number} deliveryTime - In minutes
 * @property {number} minOrder
 * @property {boolean} isVegOnly
 * @property {number} costForTwo
 * @property {number} tableCapacity - Default 20
 * @property {Date} createdAt
 * @property {Date} updatedAt
 *
 * @typedef {Object} MenuItemDoc
 * @property {import('mongodb').ObjectId} _id
 * @property {import('mongodb').ObjectId} restaurantId
 * @property {string} name
 * @property {string} [description] - Max 300
 * @property {number} price - Min 0
 * @property {string} category
 * @property {string} [image]
 * @property {boolean} isVeg
 * @property {boolean} isAvailable - Default true
 * @property {boolean} [isBestseller] - Default false
 * @property {Date} createdAt
 * @property {Date} updatedAt
 *
 * @typedef {Object} CartDoc
 * @property {import('mongodb').ObjectId} _id
 * @property {import('mongodb').ObjectId} userId - Unique
 * @property {import('mongodb').ObjectId|null} restaurantId
 * @property {{ menuItemId: import('mongodb').ObjectId, quantity: number }[]} items
 * @property {Date} createdAt
 * @property {Date} updatedAt
 *
 * @typedef {Object} OrderDoc
 * @property {import('mongodb').ObjectId} _id
 * @property {string} orderNumber - Unique, format FB-YYYYMMDD-XXXXX
 * @property {import('mongodb').ObjectId} userId
 * @property {import('mongodb').ObjectId} restaurantId
 * @property {{ menuItemId: import('mongodb').ObjectId, name: string, price: number, quantity: number, isVeg: boolean }[]} items
 * @property {number} subtotal
 * @property {number} deliveryFee
 * @property {number} tax
 * @property {number} total
 * @property {{ line1: string, area: string, city: string, pincode: string, phone: string }} deliveryAddress
 * @property {'COD'|'ONLINE'} paymentMethod
 * @property {'PENDING'|'PAID'|'FAILED'|'REFUNDED'} paymentStatus
 * @property {'PLACED'|'CONFIRMED'|'PREPARING'|'OUT_FOR_DELIVERY'|'DELIVERED'|'CANCELLED'} status
 * @property {{ status: string, at: Date }[]} statusHistory
 * @property {string} [note]
 * @property {string} [cancelledReason]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 *
 * @typedef {Object} BookingDoc
 * @property {import('mongodb').ObjectId} _id
 * @property {import('mongodb').ObjectId} userId
 * @property {import('mongodb').ObjectId} restaurantId
 * @property {Date} date
 * @property {string} timeSlot
 * @property {number} guests - 1 to 20
 * @property {'PENDING'|'CONFIRMED'|'CANCELLED'} status
 * @property {string} [note]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

// Phone regex: 10 digits starting with 6-9
export const phoneRegex = /^[6-9]\d{9}$/;
// Chennai pincode regex: 6 digits starting with 6
export const pincodeRegex = /^6\d{5}$/;

// Address validation schema
export const addressSchema = z
  .object({
    label: z.enum(['Home', 'Work', 'Other']),
    line1: z.string().min(3, 'Address line 1 is required'),
    line2: z.string().optional().default(''),
    area: z.enum(CHENNAI_AREAS as unknown as [string, ...string[]]),
    city: z.string().default('Chennai'),
    pincode: z
      .string()
      .regex(pincodeRegex, 'Pincode must be 6 digits starting with 6 (Chennai)'),
    isDefault: z.boolean().default(false),
  })
  .strict();

// User profile update schema
export const userUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().regex(phoneRegex, 'Invalid 10-digit Indian mobile number').optional(),
  })
  .strict();

// Restaurant validation schema for writes
export const restaurantWriteSchema = z
  .object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1),
    description: z.string().max(500),
    cuisines: z.array(z.string().min(1)).min(1),
    image: z.string().url('Restaurant image must be a valid URL'),
    area: z.enum(CHENNAI_AREAS as unknown as [string, ...string[]]),
    address: z
      .object({
        line1: z.string().min(1),
        area: z.string().min(1),
        city: z.string().default('Chennai'),
        pincode: z.string().regex(pincodeRegex),
      })
      .strict(),
    rating: z.number().min(0).max(5).default(4.0),
    ratingCount: z.number().min(0).default(0),
    isOpen: z.boolean().default(true),
    openingHours: z
      .object({
        open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      })
      .strict(),
    deliveryTime: z.number().min(5).max(120),
    minOrder: z.number().min(0),
    isVegOnly: z.boolean().default(false),
    costForTwo: z.number().min(50),
    tableCapacity: z.number().min(1).max(200).default(20),
  })
  .strict();

// Menu item validation schema for writes
export const menuItemWriteSchema = z
  .object({
    restaurantId: z.string().min(1),
    name: z.string().min(1).max(100),
    description: z.string().max(300).optional().default(''),
    price: z.number().min(0, 'Price must be non-negative'),
    category: z.string().min(1),
    image: z.string().url().optional().or(z.literal('')),
    isVeg: z.boolean(),
    isAvailable: z.boolean().default(true),
    isBestseller: z.boolean().default(false),
  })
  .strict();

// Cart item addition schema
export const cartItemAddSchema = z
  .object({
    menuItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
    replaceCart: z.boolean().optional().default(false),
  })
  .strict();

// Cart item quantity update schema
export const cartItemUpdateSchema = z
  .object({
    quantity: z.number().int().min(0).max(20),
  })
  .strict();

// Order creation schema
export const orderCreateSchema = z
  .object({
    addressId: z.string().optional(),
    deliveryAddress: z
      .object({
        line1: z.string().min(3),
        area: z.enum(CHENNAI_AREAS as unknown as [string, ...string[]]),
        city: z.string().default('Chennai'),
        pincode: z.string().regex(pincodeRegex),
        phone: z.string().regex(phoneRegex),
      })
      .strict()
      .optional(),
    paymentMethod: z.enum(['COD', 'ONLINE']),
    note: z.string().max(200).optional().default(''),
  })
  .strict()
  .refine((data) => data.addressId || data.deliveryAddress, {
    message: 'Either addressId or deliveryAddress must be provided',
  });

// Order cancellation schema
export const orderCancelSchema = z
  .object({
    reason: z.string().min(3, 'Cancellation reason is required').max(300),
  })
  .strict();

// Order status update schema (Admin)
export const orderStatusUpdateSchema = z
  .object({
    status: z.enum([
      'PLACED',
      'CONFIRMED',
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ]),
  })
  .strict();

// Booking creation schema
export const bookingCreateSchema = z
  .object({
    restaurantId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    timeSlot: z.enum(BOOKING_TIME_SLOTS as unknown as [string, ...string[]]),
    guests: z.number().int().min(1).max(20),
    note: z.string().max(200).optional().default(''),
  })
  .strict();

// Booking status update schema (Admin)
export const bookingStatusUpdateSchema = z
  .object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  })
  .strict();

// Admin user role update schema
export const userRoleUpdateSchema = z
  .object({
    role: z.enum(['customer', 'admin']),
  })
  .strict();
