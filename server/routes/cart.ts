import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { cartItemAddSchema, cartItemUpdateSchema } from '../schemas/validation';
import { TAX_RATE, DELIVERY_FEE, FREE_DELIVERY_ABOVE } from '../../src/config/constants';

export const cartRouter = Router();

/**
 * Helper to fetch a fully populated cart with computed financial totals
 */
export async function getPopulatedCart(userId: ObjectId) {
  const db = getDb();
  const cartsCol = db.collection('carts');

  // Find or create cart doc
  let cart = await cartsCol.findOne({ userId });
  if (!cart) {
    const now = new Date();
    await cartsCol.insertOne({
      _id: new ObjectId(),
      userId,
      restaurantId: null,
      items: [],
      createdAt: now,
      updatedAt: now,
    });
    cart = await cartsCol.findOne({ userId });
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return {
      _id: cart?._id,
      restaurant: null,
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      tax: 0,
      total: 0,
      freeDeliveryThreshold: FREE_DELIVERY_ABOVE,
      amountNeededForFreeDelivery: FREE_DELIVERY_ABOVE,
    };
  }

  // Lookup restaurant
  const restaurant = cart.restaurantId
    ? await db.collection('restaurants').findOne({ _id: cart.restaurantId })
    : null;

  // Lookup menu items
  const menuItemIds = cart.items.map((i: any) => i.menuItemId);
  const menuItems = await db
    .collection('menuItems')
    .find({ _id: { $in: menuItemIds } })
    .toArray();

  const menuItemMap = new Map(menuItems.map((m: any) => [m._id.toString(), m]));

  const populatedItems: any[] = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const menuItem = menuItemMap.get(item.menuItemId.toString());
    if (menuItem) {
      const lineTotal = menuItem.price * item.quantity;
      subtotal += lineTotal;
      populatedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image || '',
        isVeg: menuItem.isVeg,
        isAvailable: menuItem.isAvailable,
        quantity: item.quantity,
        lineTotal,
      });
    }
  }

  const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
  const amountNeededForFreeDelivery = Math.max(0, FREE_DELIVERY_ABOVE - subtotal);

  return {
    _id: cart._id,
    restaurant: restaurant
      ? {
          _id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
          image: restaurant.image,
          area: restaurant.area,
          minOrder: restaurant.minOrder,
          isOpen: restaurant.isOpen,
          deliveryTime: restaurant.deliveryTime,
        }
      : null,
    items: populatedItems,
    subtotal,
    deliveryFee,
    tax,
    total,
    freeDeliveryThreshold: FREE_DELIVERY_ABOVE,
    amountNeededForFreeDelivery,
  };
}

/**
 * GET /api/cart
 * Returns the current user's cart populated with menu item details and computed totals
 */
cartRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await getPopulatedCart(req.user._id);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cart/items
 * Adds an item to the cart. Rejects unavailable items.
 * Returns 409 { code: "DIFFERENT_RESTAURANT" } if adding an item from a different restaurant,
 * unless replaceCart is set to true.
 */
cartRouter.post('/items', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menuItemId, quantity, replaceCart } = cartItemAddSchema.parse(req.body);
    if (!ObjectId.isValid(menuItemId)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID' });
      return;
    }

    const db = getDb();
    const menuItem = await db.collection('menuItems').findOne({ _id: new ObjectId(menuItemId) });

    if (!menuItem) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    if (!menuItem.isAvailable) {
      res.status(400).json({ success: false, message: 'This item is currently unavailable' });
      return;
    }

    const itemRestaurantId = menuItem.restaurantId;
    const cartsCol = db.collection('carts');
    let cart = await cartsCol.findOne({ userId: req.user._id });

    if (!cart) {
      const now = new Date();
      await cartsCol.insertOne({
        _id: new ObjectId(),
        userId: req.user._id,
        restaurantId: null,
        items: [],
        createdAt: now,
        updatedAt: now,
      });
      cart = await cartsCol.findOne({ userId: req.user._id });
    }

    if (!cart) {
      res.status(500).json({ success: false, message: 'Failed to access or initialize cart' });
      return;
    }

    // Check if cart already contains items from a different restaurant
    const hasItems = cart && cart.items && cart.items.length > 0;
    const differentRestaurant =
      hasItems &&
      cart.restaurantId &&
      cart.restaurantId.toString() !== itemRestaurantId.toString();

    if (differentRestaurant) {
      if (!replaceCart) {
        // Fetch conflicting restaurant's name for clear user prompt
        const currentRest = await db.collection('restaurants').findOne({ _id: cart.restaurantId });
        const newRest = await db.collection('restaurants').findOne({ _id: itemRestaurantId });

        res.status(409).json({
          success: false,
          code: 'DIFFERENT_RESTAURANT',
          message: `Your cart contains items from ${currentRest?.name || 'another restaurant'}. Would you like to clear your cart and add items from ${newRest?.name || 'this restaurant'} instead?`,
          data: {
            currentRestaurant: currentRest?.name,
            newRestaurant: newRest?.name,
          },
        });
        return;
      }

      // If replaceCart is true, clear old items and set new restaurant
      await cartsCol.updateOne(
        { _id: cart._id },
        {
          $set: {
            restaurantId: itemRestaurantId,
            items: [{ menuItemId: menuItem._id, quantity }],
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Same restaurant or empty cart
      const existingItemIndex = cart.items.findIndex(
        (i: any) => i.menuItemId.toString() === menuItem._id.toString()
      );

      let newItems = [...cart.items];
      if (existingItemIndex > -1) {
        const newQty = Math.min(20, newItems[existingItemIndex].quantity + quantity);
        newItems[existingItemIndex].quantity = newQty;
      } else {
        newItems.push({ menuItemId: menuItem._id, quantity });
      }

      await cartsCol.updateOne(
        { _id: cart._id },
        {
          $set: {
            restaurantId: itemRestaurantId,
            items: newItems,
            updatedAt: new Date(),
          },
        }
      );
    }

    const updatedCart = await getPopulatedCart(req.user._id);
    res.json({
      success: true,
      data: updatedCart,
      message: 'Item added to cart',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/cart/items/:menuItemId
 * Updates item quantity in the cart. If quantity === 0, removes the item.
 */
cartRouter.patch('/items/:menuItemId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menuItemId } = req.params;
    if (!ObjectId.isValid(menuItemId)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID' });
      return;
    }

    const { quantity } = cartItemUpdateSchema.parse(req.body);
    const db = getDb();
    const cartsCol = db.collection('carts');
    const cart = await cartsCol.findOne({ userId: req.user._id });

    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found' });
      return;
    }

    let updatedItems = [...cart.items];
    if (quantity <= 0) {
      updatedItems = updatedItems.filter(
        (i: any) => i.menuItemId.toString() !== menuItemId
      );
    } else {
      const idx = updatedItems.findIndex((i: any) => i.menuItemId.toString() === menuItemId);
      if (idx > -1) {
        updatedItems[idx].quantity = quantity;
      }
    }

    const newRestaurantId = updatedItems.length === 0 ? null : cart.restaurantId;

    await cartsCol.updateOne(
      { _id: cart._id },
      {
        $set: {
          restaurantId: newRestaurantId,
          items: updatedItems,
          updatedAt: new Date(),
        },
      }
    );

    const updatedCart = await getPopulatedCart(req.user._id);
    res.json({ success: true, data: updatedCart, message: 'Cart updated' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart/items/:menuItemId
 * Removes a specific item from the cart
 */
cartRouter.delete('/items/:menuItemId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menuItemId } = req.params;
    if (!ObjectId.isValid(menuItemId)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID' });
      return;
    }

    const db = getDb();
    const cartsCol = db.collection('carts');
    const cart = await cartsCol.findOne({ userId: req.user._id });

    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found' });
      return;
    }

    const updatedItems = cart.items.filter((i: any) => i.menuItemId.toString() !== menuItemId);
    const newRestaurantId = updatedItems.length === 0 ? null : cart.restaurantId;

    await cartsCol.updateOne(
      { _id: cart._id },
      {
        $set: {
          restaurantId: newRestaurantId,
          items: updatedItems,
          updatedAt: new Date(),
        },
      }
    );

    const updatedCart = await getPopulatedCart(req.user._id);
    res.json({ success: true, data: updatedCart, message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart
 * Clears the entire cart
 */
cartRouter.delete('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    await db.collection('carts').updateOne(
      { userId: req.user._id },
      {
        $set: {
          restaurantId: null,
          items: [],
          updatedAt: new Date(),
        },
      }
    );

    const updatedCart = await getPopulatedCart(req.user._id);
    res.json({ success: true, data: updatedCart, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
});
