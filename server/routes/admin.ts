import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { clerkClient } from '@clerk/express';
import { getDb } from '../db/connection';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  restaurantWriteSchema,
  menuItemWriteSchema,
  orderStatusUpdateSchema,
  bookingStatusUpdateSchema,
  userRoleUpdateSchema,
} from '../schemas/validation';
import { ORDER_STATUS_FLOW, OrderStatus } from '../../src/config/constants';

export const adminRouter = Router();

// Apply auth + admin check to all routes in admin router
adminRouter.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/stats
 * Aggregated analytics for the admin dashboard
 */
adminRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const ordersCol = db.collection('orders');
    const bookingsCol = db.collection('bookings');

    // Total orders count
    const totalOrders = await ordersCol.countDocuments();

    // Total revenue for DELIVERED orders only
    const revenueResult = await ordersCol
      .aggregate([
        { $match: { status: 'DELIVERED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
      ])
      .toArray();
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Active orders count
    const activeOrders = await ordersCol.countDocuments({
      status: { $in: ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'] },
    });

    // Orders grouped by status
    const statusCounts = await ordersCol
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray();
    const ordersByStatus: Record<string, number> = {};
    for (const sc of statusCounts) {
      ordersByStatus[sc._id] = sc.count;
    }

    // Orders & revenue over the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const last7DaysAggregation = await ordersCol
      .aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$total', 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Fill missing dates in 7-day range
    const ordersLast7Days: { date: string; orders: number; revenue: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const match = last7DaysAggregation.find((item) => item._id === dateStr);
      ordersLast7Days.push({
        date: dateStr,
        orders: match ? match.orders : 0,
        revenue: match ? match.revenue : 0,
      });
    }

    // Top 5 restaurants by order count
    const topRestaurants = await ordersCol
      .aggregate([
        { $group: { _id: '$restaurantId', orderCount: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
        { $sort: { orderCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        { $unwind: '$restaurant' },
        {
          $project: {
            _id: 1,
            name: '$restaurant.name',
            area: '$restaurant.area',
            orderCount: 1,
            totalRevenue: 1,
          },
        },
      ])
      .toArray();

    // Pending bookings count
    const pendingBookings = await bookingsCol.countDocuments({ status: 'PENDING' });

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue),
        activeOrders,
        pendingBookings,
        ordersByStatus,
        ordersLast7Days,
        topRestaurants,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * RESTAURANTS CRUD
 */
adminRouter.get('/restaurants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const restaurants = await db.collection('restaurants').find().sort({ createdAt: -1 }).toArray();
    res.json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/restaurants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = restaurantWriteSchema.parse(req.body);
    const db = getDb();
    const now = new Date();

    const newDoc = {
      _id: new ObjectId(),
      ...validatedData,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('restaurants').insertOne(newDoc);
    res.status(201).json({ success: true, data: newDoc, message: 'Restaurant created successfully' });
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/restaurants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
      return;
    }

    const validatedData = restaurantWriteSchema.parse(req.body);
    const db = getDb();

    await db.collection('restaurants').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...validatedData,
          updatedAt: new Date(),
        },
      }
    );

    const updated = await db.collection('restaurants').findOne({ _id: new ObjectId(id) });
    res.json({ success: true, data: updated, message: 'Restaurant updated successfully' });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/restaurants/:id/toggle-open', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
      return;
    }

    const db = getDb();
    const rest = await db.collection('restaurants').findOne({ _id: new ObjectId(id) });
    if (!rest) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const newIsOpen = !rest.isOpen;
    await db.collection('restaurants').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isOpen: newIsOpen, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      data: { isOpen: newIsOpen },
      message: `Restaurant is now ${newIsOpen ? 'Open' : 'Closed'}`,
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/restaurants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
      return;
    }

    const db = getDb();
    const restId = new ObjectId(id);

    await db.collection('restaurants').deleteOne({ _id: restId });
    await db.collection('menuItems').deleteMany({ restaurantId: restId });

    res.json({ success: true, message: 'Restaurant and its menu items deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * MENU ITEMS CRUD
 */
adminRouter.get('/menu-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.query;
    const db = getDb();
    const filter: any = {};
    if (restaurantId && ObjectId.isValid(restaurantId as string)) {
      filter.restaurantId = new ObjectId(restaurantId as string);
    }

    const items = await db.collection('menuItems').find(filter).sort({ category: 1, name: 1 }).toArray();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/menu-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = menuItemWriteSchema.parse(req.body);
    const db = getDb();
    const now = new Date();

    const newDoc = {
      _id: new ObjectId(),
      ...validatedData,
      restaurantId: new ObjectId(validatedData.restaurantId),
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('menuItems').insertOne(newDoc);
    res.status(201).json({ success: true, data: newDoc, message: 'Menu item created successfully' });
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/menu-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID' });
      return;
    }

    const validatedData = menuItemWriteSchema.parse(req.body);
    const db = getDb();

    await db.collection('menuItems').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...validatedData,
          restaurantId: new ObjectId(validatedData.restaurantId),
          updatedAt: new Date(),
        },
      }
    );

    const updated = await db.collection('menuItems').findOne({ _id: new ObjectId(id) });
    res.json({ success: true, data: updated, message: 'Menu item updated successfully' });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/menu-items/:id/toggle-available', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID' });
      return;
    }

    const db = getDb();
    const item = await db.collection('menuItems').findOne({ _id: new ObjectId(id) });
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    const newAvail = !item.isAvailable;
    await db.collection('menuItems').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isAvailable: newAvail, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      data: { isAvailable: newAvail },
      message: `Item is now ${newAvail ? 'Available' : 'Unavailable'}`,
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/menu-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID' });
      return;
    }

    const db = getDb();
    await db.collection('menuItems').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * ORDERS MANAGEMENT
 */
adminRouter.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { status, search, startDate, endDate, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }
    if (search && typeof search === 'string' && search.trim()) {
      filter.orderNumber = { $regex: search.trim(), $options: 'i' };
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const total = await db.collection('orders').countDocuments(filter);

    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
      },
    ];

    const orders = await db.collection('orders').aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: {
        items: orders,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/orders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID' });
      return;
    }

    const { status: targetStatus } = orderStatusUpdateSchema.parse(req.body);
    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.findOne({ _id: new ObjectId(id) });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const currentStatus = order.status as OrderStatus;

    // Validate status transition rule:
    // ORDER_STATUS_FLOW: PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
    // CANCELLED only allowed from PLACED or CONFIRMED
    const allowedTransitions: Record<string, string[]> = {
      PLACED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed next states: ${allowed.join(', ') || 'None (terminal state)'}`,
      });
      return;
    }

    const now = new Date();
    const updateFields: any = {
      status: targetStatus,
      updatedAt: now,
    };

    // If COD order becomes DELIVERED, automatically set paymentStatus: PAID
    if (targetStatus === 'DELIVERED' && order.paymentMethod === 'COD') {
      updateFields.paymentStatus = 'PAID';
    }

    await ordersCol.updateOne(
      { _id: order._id },
      {
        $set: updateFields,
        $push: {
          statusHistory: { status: targetStatus, at: now } as any,
        },
      }
    );

    const updated = await ordersCol.findOne({ _id: order._id });
    res.json({
      success: true,
      data: updated,
      message: `Order status updated to ${targetStatus}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * BOOKINGS MANAGEMENT
 */
adminRouter.get('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { status, date } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (date && typeof date === 'string') {
      const d = new Date(`${date}T00:00:00.000Z`);
      filter.date = d;
    }

    const pipeline = [
      { $match: filter },
      { $sort: { date: -1, timeSlot: 1 } },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
      },
    ];

    const bookings = await db.collection('bookings').aggregate(pipeline).toArray();
    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/bookings/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid booking ID' });
      return;
    }

    const { status } = bookingStatusUpdateSchema.parse(req.body);
    const db = getDb();

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: `Booking status updated to ${status}` });
  } catch (error) {
    next(error);
  }
});

/**
 * USERS MANAGEMENT
 */
adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const users = await db
      .collection('users')
      .find({}, { projection: { clerkId: 1, name: 1, email: 1, phone: 1, role: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    const { role } = userRoleUpdateSchema.parse(req.body);
    const db = getDb();
    const usersCol = db.collection('users');

    const user = await usersCol.findOne({ _id: new ObjectId(id) });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Update role in MongoDB
    await usersCol.updateOne(
      { _id: user._id },
      { $set: { role, updatedAt: new Date() } }
    );

    // Sync role with Clerk user publicMetadata
    try {
      if (user.clerkId) {
        await clerkClient.users.updateUserMetadata(user.clerkId, {
          publicMetadata: {
            role,
          },
        });
        console.log(`[Admin] Updated Clerk publicMetadata for ${user.clerkId} to role='${role}'`);
      }
    } catch (clerkErr: any) {
      console.warn('[Admin] Failed to update Clerk metadata (will still use MongoDB role):', clerkErr.message);
    }

    res.json({
      success: true,
      message: `User role updated to '${role}'`,
      data: { role },
    });
  } catch (error) {
    next(error);
  }
});
