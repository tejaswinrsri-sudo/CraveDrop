import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { bookingCreateSchema } from '../schemas/validation';

export const bookingRouter = Router();

/**
 * POST /api/bookings
 * Reserves a table at a restaurant for a specific date and time slot.
 * Enforces restaurant table capacity via aggregation sum.
 */
bookingRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bookingCreateSchema.parse(req.body);
    const db = getDb();
    const userId = req.user._id;

    if (!ObjectId.isValid(validatedData.restaurantId)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
      return;
    }

    const restaurantObjectId = new ObjectId(validatedData.restaurantId);
    const restaurant = await db.collection('restaurants').findOne({ _id: restaurantObjectId });

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    // Parse date at start of day UTC
    const bookingDate = new Date(`${validatedData.date}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (bookingDate < today) {
      res.status(400).json({
        success: false,
        message: 'Booking date must be today or in the future',
      });
      return;
    }

    const tableCapacity = restaurant.tableCapacity || 20;

    // Sum currently booked guests for this restaurant, date, and slot (ignoring CANCELLED)
    const bookedPipeline = [
      {
        $match: {
          restaurantId: restaurantObjectId,
          date: bookingDate,
          timeSlot: validatedData.timeSlot,
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: '$guests' },
        },
      },
    ];

    const bookedResult = await db.collection('bookings').aggregate(bookedPipeline).toArray();
    const currentlyBookedGuests = bookedResult.length > 0 ? bookedResult[0].totalGuests : 0;
    const requestedGuests = validatedData.guests;

    if (currentlyBookedGuests + requestedGuests > tableCapacity) {
      const remainingSeats = Math.max(0, tableCapacity - currentlyBookedGuests);
      res.status(400).json({
        success: false,
        message: `Sorry, this time slot cannot accommodate ${requestedGuests} guests. Only ${remainingSeats} seat(s) remaining for ${validatedData.timeSlot} on this date.`,
      });
      return;
    }

    const now = new Date();
    const newBookingDoc = {
      _id: new ObjectId(),
      userId,
      restaurantId: restaurantObjectId,
      date: bookingDate,
      timeSlot: validatedData.timeSlot,
      guests: requestedGuests,
      status: 'CONFIRMED',
      note: validatedData.note || '',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('bookings').insertOne(newBookingDoc);

    res.status(201).json({
      success: true,
      data: newBookingDoc,
      message: 'Table booked successfully!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings
 * Returns user's bookings with joined restaurant info, sorted newest date first
 */
bookingRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.user._id;

    const pipeline = [
      { $match: { userId } },
      { $sort: { date: -1, createdAt: -1 } },
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

    const bookings = await db.collection('bookings').aggregate(pipeline).toArray();

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/bookings/:id/cancel
 * Customer cancels their booking
 */
bookingRouter.patch('/:id/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid booking ID' });
      return;
    }

    const db = getDb();
    const bookingObjectId = new ObjectId(id);
    const booking = await db.collection('bookings').findOne({
      _id: bookingObjectId,
      userId: req.user._id,
    });

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (booking.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Booking is already cancelled' });
      return;
    }

    await db.collection('bookings').updateOne(
      { _id: bookingObjectId },
      {
        $set: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    next(error);
  }
});
