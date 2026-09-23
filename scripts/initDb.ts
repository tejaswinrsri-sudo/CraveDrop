import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';

async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL: MONGODB_URI is not set in environment or .env');
    process.exit(1);
  }

  console.log('[InitDb] Connecting to MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('food_booking');

  console.log('[InitDb] Setting up collections with $jsonSchema validators and indexes...');

  const collections = await db.listCollections().toArray();
  const existingColNames = new Set(collections.map((c) => c.name));

  // 1. USERS COLLECTION
  const userSchema = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['clerkId', 'email', 'role'],
      properties: {
        clerkId: { bsonType: 'string', description: 'Clerk user ID is required' },
        email: { bsonType: 'string', description: 'User email is required' },
        role: { enum: ['customer', 'admin'], description: 'Role must be customer or admin' },
        name: { bsonType: 'string' },
        phone: { bsonType: 'string' },
        imageUrl: { bsonType: 'string' },
        addresses: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  if (!existingColNames.has('users')) {
    await db.createCollection('users', { validator: userSchema });
    console.log('[InitDb] Created "users" collection with validator.');
  } else {
    await db.command({ collMod: 'users', validator: userSchema });
    console.log('[InitDb] Updated "users" collection validator.');
  }
  await db.collection('users').createIndex({ clerkId: 1 }, { unique: true });
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  // 2. RESTAURANTS COLLECTION
  const restaurantSchema = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'slug', 'area', 'image'],
      properties: {
        name: { bsonType: 'string', maxLength: 100 },
        slug: { bsonType: 'string' },
        description: { bsonType: 'string', maxLength: 500 },
        cuisines: { bsonType: 'array' },
        image: { bsonType: 'string' },
        area: { bsonType: 'string' },
        address: { bsonType: 'object' },
        rating: { bsonType: 'number' },
        ratingCount: { bsonType: 'number' },
        isOpen: { bsonType: 'bool' },
        deliveryTime: { bsonType: 'number' },
        minOrder: { bsonType: 'number' },
        isVegOnly: { bsonType: 'bool' },
        costForTwo: { bsonType: 'number' },
        tableCapacity: { bsonType: 'number' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  if (!existingColNames.has('restaurants')) {
    await db.createCollection('restaurants', { validator: restaurantSchema });
    console.log('[InitDb] Created "restaurants" collection with validator.');
  } else {
    await db.command({ collMod: 'restaurants', validator: restaurantSchema });
    console.log('[InitDb] Updated "restaurants" collection validator.');
  }
  await db.collection('restaurants').createIndex({ slug: 1 }, { unique: true });
  await db.collection('restaurants').createIndex({ name: 'text', cuisines: 'text' });
  await db.collection('restaurants').createIndex({ area: 1 });
  await db.collection('restaurants').createIndex({ rating: -1 });

  // 3. MENU ITEMS COLLECTION
  const menuItemSchema = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['restaurantId', 'name', 'price', 'category', 'isVeg'],
      properties: {
        restaurantId: { bsonType: 'objectId' },
        name: { bsonType: 'string' },
        description: { bsonType: 'string', maxLength: 300 },
        price: { bsonType: 'number', minimum: 0 },
        category: { bsonType: 'string' },
        image: { bsonType: 'string' },
        isVeg: { bsonType: 'bool' },
        isAvailable: { bsonType: 'bool' },
        isBestseller: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  if (!existingColNames.has('menuItems')) {
    await db.createCollection('menuItems', { validator: menuItemSchema });
    console.log('[InitDb] Created "menuItems" collection with validator.');
  } else {
    await db.command({ collMod: 'menuItems', validator: menuItemSchema });
    console.log('[InitDb] Updated "menuItems" collection validator.');
  }
  await db.collection('menuItems').createIndex({ restaurantId: 1 });
  await db.collection('menuItems').createIndex({ restaurantId: 1, category: 1 });

  // 4. CARTS COLLECTION
  const cartSchema = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId'],
      properties: {
        userId: { bsonType: 'objectId' },
        restaurantId: { bsonType: ['objectId', 'null'] },
        items: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  if (!existingColNames.has('carts')) {
    await db.createCollection('carts', { validator: cartSchema });
    console.log('[InitDb] Created "carts" collection with validator.');
  } else {
    await db.command({ collMod: 'carts', validator: cartSchema });
    console.log('[InitDb] Updated "carts" collection validator.');
  }
  await db.collection('carts').createIndex({ userId: 1 }, { unique: true });

  // 5. ORDERS COLLECTION
  const orderSchema = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['orderNumber', 'userId', 'restaurantId', 'items', 'subtotal', 'total', 'status'],
      properties: {
        orderNumber: { bsonType: 'string' },
        userId: { bsonType: 'objectId' },
        restaurantId: { bsonType: 'objectId' },
        items: { bsonType: 'array' },
        subtotal: { bsonType: 'number' },
        deliveryFee: { bsonType: 'number' },
        tax: { bsonType: 'number' },
        total: { bsonType: 'number' },
        status: {
          enum: ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
        },
        paymentMethod: { enum: ['COD', 'ONLINE'] },
        paymentStatus: { enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  if (!existingColNames.has('orders')) {
    await db.createCollection('orders', { validator: orderSchema });
    console.log('[InitDb] Created "orders" collection with validator.');
  } else {
    await db.command({ collMod: 'orders', validator: orderSchema });
    console.log('[InitDb] Updated "orders" collection validator.');
  }
  await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
  await db.collection('orders').createIndex({ userId: 1 });
  await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('orders').createIndex({ status: 1, createdAt: -1 });

  // 6. BOOKINGS COLLECTION
  const bookingSchema = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'restaurantId', 'date', 'timeSlot', 'guests', 'status'],
      properties: {
        userId: { bsonType: 'objectId' },
        restaurantId: { bsonType: 'objectId' },
        date: { bsonType: 'date' },
        timeSlot: { bsonType: 'string' },
        guests: { bsonType: 'number' },
        status: { enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  if (!existingColNames.has('bookings')) {
    await db.createCollection('bookings', { validator: bookingSchema });
    console.log('[InitDb] Created "bookings" collection with validator.');
  } else {
    await db.command({ collMod: 'bookings', validator: bookingSchema });
    console.log('[InitDb] Updated "bookings" collection validator.');
  }
  await db.collection('bookings').createIndex({ userId: 1 });
  await db.collection('bookings').createIndex({ restaurantId: 1, date: 1, timeSlot: 1 });

  console.log('[InitDb] Database schemas and indexes initialized successfully!');
  await client.close();
}

initDb().catch((err) => {
  console.error('[InitDb] Error initializing database:', err);
  process.exit(1);
});
