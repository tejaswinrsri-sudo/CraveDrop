import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getDb, getMongoClient } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { orderCreateSchema, orderCancelSchema } from '../schemas/validation';
import { TAX_RATE, DELIVERY_FEE, FREE_DELIVERY_ABOVE } from '../../src/config/constants';

export const orderRouter = Router();

/**
 * Generates an order number in format: FB-YYYYMMDD-XXXXX
 */
function generateOrderNumber(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `FB-${year}${month}${day}-${rand}`;
}

/**
 * POST /api/orders
 * Places an order from the user's active cart.
 * Recomputes all prices, tax, delivery fee server-side from fresh DB lookups.
 * Enforces minOrder and restaurant.isOpen.
 */
orderRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = orderCreateSchema.parse(req.body);
    const db = getDb();
    const client = getMongoClient();
    const userId = req.user._id;

    // 1. Fetch user's cart
    const cart = await db.collection('carts').findOne({ userId });
    if (!cart || !cart.items || cart.items.length === 0 || !cart.restaurantId) {
      res.status(400).json({ success: false, message: 'Your cart is empty' });
      return;
    }

    // 2. Fetch restaurant and check isOpen
    const restaurant = await db.collection('restaurants').findOne({ _id: cart.restaurantId });
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    if (!restaurant.isOpen) {
      res.status(400).json({
        success: false,
        message: `${restaurant.name} is currently closed and not accepting orders.`,
      });
      return;
    }

    // 3. Resolve delivery address
    let deliveryAddress: any = null;
    if (validatedData.addressId) {
      if (!ObjectId.isValid(validatedData.addressId)) {
        res.status(400).json({ success: false, message: 'Invalid address ID' });
        return;
      }
      const user = await db.collection('users').findOne({ _id: userId });
      const foundAddr = user?.addresses?.find(
        (a: any) => a._id.toString() === validatedData.addressId
      );
      if (!foundAddr) {
        res.status(404).json({ success: false, message: 'Saved address not found' });
        return;
      }
      deliveryAddress = {
        line1: foundAddr.line1,
        area: foundAddr.area,
        city: foundAddr.city || 'Chennai',
        pincode: foundAddr.pincode,
        phone: user?.phone || req.user.phone || '9876543210',
      };
    } else if (validatedData.deliveryAddress) {
      deliveryAddress = validatedData.deliveryAddress;
    }

    if (!deliveryAddress) {
      res.status(400).json({ success: false, message: 'Delivery address is required' });
      return;
    }

    // 4. Re-fetch every menuItem by _id from DB and snapshot names + prices
    const menuItemIds = cart.items.map((i: any) => i.menuItemId);
    const dbMenuItems = await db
      .collection('menuItems')
      .find({ _id: { $in: menuItemIds } })
      .toArray();

    const dbItemMap = new Map(dbMenuItems.map((m: any) => [m._id.toString(), m]));

    const snapshotItems: any[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const menuItem = dbItemMap.get(item.menuItemId.toString());
      if (!menuItem) {
        res.status(400).json({
          success: false,
          message: `One of the items in your cart is no longer available. Please update your cart.`,
        });
        return;
      }
      if (!menuItem.isAvailable) {
        res.status(400).json({
          success: false,
          message: `"${menuItem.name}" is currently sold out. Please remove it from your cart.`,
        });
        return;
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;
      snapshotItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price, // SNAPSHOT taken server-side
        quantity: item.quantity,
        isVeg: menuItem.isVeg,
      });
    }

    // 5. Enforce minimum order requirement
    if (restaurant.minOrder && subtotal < restaurant.minOrder) {
      res.status(400).json({
        success: false,
        message: `Order subtotal (₹${subtotal}) is less than the minimum order requirement of ₹${restaurant.minOrder} for ${restaurant.name}.`,
      });
      return;
    }

    // 6. Server-side computation of delivery fee and tax
    const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    const now = new Date();
    const orderNumber = generateOrderNumber();
    const paymentStatus = validatedData.paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING';

    const newOrderDoc = {
      _id: new ObjectId(),
      orderNumber,
      userId,
      restaurantId: restaurant._id,
      items: snapshotItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      deliveryAddress,
      paymentMethod: validatedData.paymentMethod,
      paymentStatus,
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: now }],
      note: validatedData.note || '',
      cancelledReason: '',
      createdAt: now,
      updatedAt: now,
    };

    // 7. Insert order and clear cart using MongoDB transaction where available
    let insertedOrder: any = null;
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        await db.collection('orders').insertOne(newOrderDoc, { session });
        await db.collection('carts').updateOne(
          { _id: cart._id },
          { $set: { restaurantId: null, items: [], updatedAt: new Date() } },
          { session }
        );
      });
      insertedOrder = newOrderDoc;
    } catch (txError: any) {
      // If transactions are not supported on standalone local mongo without replica set
      console.warn(
        '[Order] Replica set transaction unavailable or failed. Falling back to sequential execution:',
        txError.message
      );
      await db.collection('orders').insertOne(newOrderDoc);
      await db.collection('carts').updateOne(
        { _id: cart._id },
        { $set: { restaurantId: null, items: [], updatedAt: new Date() } }
      );
      insertedOrder = newOrderDoc;
    } finally {
      await session.endSession();
    }

    res.status(201).json({
      success: true,
      data: insertedOrder,
      message: 'Order placed successfully!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders
 * Returns paginated orders for the logged-in user, newest first
 */
orderRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.user._id;
    const { status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { userId };
    if (status && typeof status === 'string' && status !== 'ALL') {
      if (status === 'ACTIVE') {
        filter.status = { $in: ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'] };
      } else {
        filter.status = status;
      }
    }

    const total = await db.collection('orders').countDocuments(filter);

    // Aggregation pipeline to join restaurant details
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
        $unwind: {
          path: '$restaurant',
          preserveNullAndEmptyArrays: true,
        },
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

/**
 * GET /api/orders/:id
 * Fetches order details by ID (owner only)
 */
orderRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID' });
      return;
    }

    const db = getDb();
    const orderObjectId = new ObjectId(id);

    const pipeline = [
      { $match: { _id: orderObjectId, userId: req.user._id } },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      {
        $unwind: {
          path: '$restaurant',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const results = await db.collection('orders').aggregate(pipeline).toArray();
    const order = results[0];

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/orders/:id/cancel
 * Allows customer to cancel order only while status is PLACED or CONFIRMED
 */
orderRouter.patch('/:id/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID' });
      return;
    }

    const { reason } = orderCancelSchema.parse(req.body);
    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.findOne({ _id: new ObjectId(id), userId: req.user._id });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
      res.status(400).json({
        success: false,
        message: `Orders in '${order.status}' status cannot be cancelled. Cancellation is only allowed for PLACED or CONFIRMED orders.`,
      });
      return;
    }

    const now = new Date();
    await ordersCol.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'CANCELLED',
          cancelledReason: reason,
          updatedAt: now,
        },
        $push: {
          statusHistory: { status: 'CANCELLED', at: now } as any,
        },
      }
    );

    const updatedOrder = await ordersCol.findOne({ _id: order._id });
    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});
