import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { addressSchema, userUpdateSchema } from '../schemas/validation';

export const userRouter = Router();

/**
 * GET /api/users/me
 * Returns the current authenticated user document
 */
userRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: req.user._id });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me
 * Updates user profile (name, phone)
 */
userRouter.put('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = userUpdateSchema.parse(req.body);
    const db = getDb();

    const updateFields: any = {
      updatedAt: new Date(),
    };
    if (validatedData.name !== undefined) updateFields.name = validatedData.name;
    if (validatedData.phone !== undefined) updateFields.phone = validatedData.phone;

    await db.collection('users').updateOne(
      { _id: req.user._id },
      { $set: updateFields }
    );

    const updatedUser = await db.collection('users').findOne({ _id: req.user._id });
    res.json({ success: true, data: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/me/addresses
 * Adds a new address to the user's addresses array.
 * If isDefault is true, unsets isDefault on all other addresses first.
 */
userRouter.post('/me/addresses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedAddress = addressSchema.parse(req.body);
    const db = getDb();
    const usersCol = db.collection('users');

    const newAddressId = new ObjectId();
    const newAddress = {
      _id: newAddressId,
      ...validatedAddress,
    };

    // If marked default or first address, unset others
    const user = await usersCol.findOne({ _id: req.user._id });
    const isFirstAddress = !user?.addresses || user.addresses.length === 0;
    if (isFirstAddress) {
      newAddress.isDefault = true;
    }

    if (newAddress.isDefault) {
      // Unset default on existing addresses
      await usersCol.updateOne(
        { _id: req.user._id },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }

    await usersCol.updateOne(
      { _id: req.user._id },
      {
        $push: { addresses: newAddress as any },
        $set: { updatedAt: new Date() },
      }
    );

    const updatedUser = await usersCol.findOne({ _id: req.user._id });
    res.status(201).json({
      success: true,
      data: updatedUser?.addresses || [],
      message: 'Address added successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me/addresses/:addressId
 * Updates an existing address.
 */
userRouter.put('/me/addresses/:addressId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressId } = req.params;
    if (!ObjectId.isValid(addressId)) {
      res.status(400).json({ success: false, message: 'Invalid address ID' });
      return;
    }

    const validatedAddress = addressSchema.parse(req.body);
    const db = getDb();
    const usersCol = db.collection('users');
    const targetAddressObjectId = new ObjectId(addressId);

    if (validatedAddress.isDefault) {
      await usersCol.updateOne(
        { _id: req.user._id },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }

    const updateResult = await usersCol.updateOne(
      { _id: req.user._id, 'addresses._id': targetAddressObjectId },
      {
        $set: {
          'addresses.$.label': validatedAddress.label,
          'addresses.$.line1': validatedAddress.line1,
          'addresses.$.line2': validatedAddress.line2,
          'addresses.$.area': validatedAddress.area,
          'addresses.$.city': validatedAddress.city,
          'addresses.$.pincode': validatedAddress.pincode,
          'addresses.$.isDefault': validatedAddress.isDefault,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Address not found' });
      return;
    }

    const updatedUser = await usersCol.findOne({ _id: req.user._id });
    res.json({
      success: true,
      data: updatedUser?.addresses || [],
      message: 'Address updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/me/addresses/:addressId
 * Deletes an address from the user's addresses array.
 */
userRouter.delete('/me/addresses/:addressId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressId } = req.params;
    if (!ObjectId.isValid(addressId)) {
      res.status(400).json({ success: false, message: 'Invalid address ID' });
      return;
    }

    const db = getDb();
    const usersCol = db.collection('users');
    const targetAddressObjectId = new ObjectId(addressId);

    await usersCol.updateOne(
      { _id: req.user._id },
      {
        $pull: { addresses: { _id: targetAddressObjectId } as any },
        $set: { updatedAt: new Date() },
      }
    );

    const updatedUser = await usersCol.findOne({ _id: req.user._id });
    res.json({
      success: true,
      data: updatedUser?.addresses || [],
      message: 'Address removed successfully',
    });
  } catch (error) {
    next(error);
  }
});
