import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/connection';

export const restaurantRouter = Router();

/**
 * GET /api/restaurants
 * Public endpoint to query restaurants with filtering, sorting, and pagination.
 * NOTE: Does NOT apply any hidden default filters like isOpen: true.
 */
restaurantRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const {
      search,
      cuisine,
      veg,
      area,
      sort = 'rating',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    // Area filter (matches area query param strictly, agreeing with frontend)
    if (area && typeof area === 'string' && area.trim()) {
      filter.area = area.trim();
    }

    // Cuisine filter
    if (cuisine && typeof cuisine === 'string' && cuisine.trim()) {
      filter.cuisines = { $regex: new RegExp(`^${cuisine.trim()}$`, 'i') };
    }

    // Vegetarian only filter
    if (veg === 'true') {
      filter.isVegOnly = true;
    }

    // Search query (name, cuisines, description)
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { cuisines: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
      ];
    }

    // Sorting options
    const sortFieldMap: Record<string, string> = {
      rating: 'rating',
      deliveryTime: 'deliveryTime',
      costForTwo: 'costForTwo',
    };

    const sortField = sortFieldMap[sort as string] || 'rating';
    const sortDirection = order === 'asc' ? 1 : -1;
    const sortObj: any = { [sortField]: sortDirection };

    const col = db.collection('restaurants');
    const total = await col.countDocuments(filter);
    const items = await col.find(filter).sort(sortObj).skip(skip).limit(limitNum).toArray();

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        items,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/restaurants/areas/list
 * Distinct areas currently available in the database
 */
restaurantRouter.get('/areas/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const areas = await db.collection('restaurants').distinct('area');
    res.json({ success: true, data: areas });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/restaurants/cuisines/list
 * Distinct cuisines currently available in the database
 */
restaurantRouter.get('/cuisines/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const cuisines = await db.collection('restaurants').distinct('cuisines');
    res.json({ success: true, data: cuisines });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/restaurants/:id
 * Single restaurant by ObjectId or slug
 */
restaurantRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const isObjId = ObjectId.isValid(id);
    const filter = isObjId ? { $or: [{ _id: new ObjectId(id) }, { slug: id }] } : { slug: id };

    const restaurant = await db.collection('restaurants').findOne(filter);

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/restaurants/:id/menu
 * Menu items grouped by category using MongoDB $group aggregation
 */
restaurantRouter.get('/:id/menu', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const isObjId = ObjectId.isValid(id);
    const filter = isObjId ? { $or: [{ _id: new ObjectId(id) }, { slug: id }] } : { slug: id };

    // Verify restaurant exists
    const restaurant = await db.collection('restaurants').findOne(filter);
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const restaurantObjectId = restaurant._id;

    // Aggregation pipeline to group menu items by category
    const pipeline = [
      { $match: { restaurantId: restaurantObjectId } },
      { $sort: { isBestseller: -1, price: 1 } },
      {
        $group: {
          _id: '$category',
          category: { $first: '$category' },
          items: {
            $push: {
              _id: '$_id',
              restaurantId: '$restaurantId',
              name: '$name',
              description: '$description',
              price: '$price',
              category: '$category',
              image: '$image',
              isVeg: '$isVeg',
              isAvailable: '$isAvailable',
              isBestseller: '$isBestseller',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const categories = await db.collection('menuItems').aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: {
        restaurant,
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
});
