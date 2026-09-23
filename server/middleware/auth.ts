import { Request, Response, NextFunction } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/connection';

// Extend Express Request to include our MongoDB user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      auth?: any;
    }
  }
}

/**
 * Authentication Middleware:
 * Uses Clerk to authenticate the request.
 * - Reads getAuth(req).userId (returns 401 JSON if missing, NEVER a redirect).
 * - Loads the MongoDB user document by clerkId.
 * - If user does not exist in DB yet (e.g. webhook has not arrived yet),
 *   lazily creates the user from clerkClient.users.getUser().
 *
 * NOTE: For instant admin authorization without a DB roundtrip,
 * in Clerk Dashboard -> Configure -> Sessions -> Customize session token,
 * add: { "metadata": "{{user.public_metadata}}" } so that claims include the role.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
      return;
    }

    req.auth = auth;
    const db = getDb();
    const usersCol = db.collection('users');

    let user = await usersCol.findOne({ clerkId: userId });

    if (!user) {
      // Lazy creation if webhook hasn't processed user yet
      console.log(`[Auth] User ${userId} not yet in MongoDB. Initializing user doc...`);
      try {
        if (
          process.env.CLERK_SECRET_KEY &&
          !process.env.CLERK_SECRET_KEY.includes('sample') &&
          !process.env.CLERK_SECRET_KEY.includes('placeholder')
        ) {
          const clerkUser = await clerkClient.users.getUser(userId);
          const primaryEmail =
            clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
            clerkUser.emailAddresses[0]?.emailAddress ||
            '';

          const name =
            `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
            clerkUser.username ||
            'CraveDrop Customer';

          const clerkRole = (clerkUser.publicMetadata?.role as string) === 'admin' ? 'admin' : 'customer';

          const now = new Date();
          const newUserDoc = {
            _id: new ObjectId(),
            clerkId: userId,
            name,
            email: primaryEmail.toLowerCase(),
            phone: '',
            imageUrl: clerkUser.imageUrl || '',
            role: clerkRole,
            addresses: [],
            createdAt: now,
            updatedAt: now,
          };

          await usersCol.updateOne(
            { clerkId: userId },
            { $setOnInsert: newUserDoc },
            { upsert: true }
          );
        } else {
          const now = new Date();
          const newUserDoc = {
            _id: new ObjectId(),
            clerkId: userId,
            name: 'CraveDrop Customer',
            email: `${userId}@example.com`,
            phone: '',
            imageUrl: '',
            role: 'customer',
            addresses: [],
            createdAt: now,
            updatedAt: now,
          };

          await usersCol.updateOne(
            { clerkId: userId },
            { $setOnInsert: newUserDoc },
            { upsert: true }
          );
        }

        user = await usersCol.findOne({ clerkId: userId });
      } catch (err) {
        console.error('[Auth] Failed to initialize user document:', err);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error in requireAuth:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
}

/**
 * Admin Authorization Middleware:
 * Requires authenticated user and checks role === 'admin'.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const role = req.auth?.sessionClaims?.metadata?.role || req.user?.role;

  if (role === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Access denied: Admin privileges required.',
  });
}
