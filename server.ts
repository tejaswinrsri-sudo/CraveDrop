import dotenv from 'dotenv';
dotenv.config({ override: true });

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import { clerkMiddleware } from '@clerk/express';

import { connectToDatabase, getDb } from './server/db/connection';
import { handleClerkWebhook } from './server/routes/webhooks';
import { restaurantRouter } from './server/routes/restaurants';
import { userRouter } from './server/routes/users';
import { cartRouter } from './server/routes/cart';
import { orderRouter } from './server/routes/orders';
import { bookingRouter } from './server/routes/bookings';
import { adminRouter } from './server/routes/admin';
import { resolveArea } from './server/utils/resolveArea';

// ============================================================================
// ENVIRONMENT VARIABLES SETUP & GRACEFUL DEFAULTS
// ============================================================================
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/food_booking';
}
if (!process.env.CLERK_PUBLISHABLE_KEY) {
  console.warn('[Server] CLERK_PUBLISHABLE_KEY not set. Using dev placeholder key.');
  process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_sample_clerk_key';
}
if (!process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.VITE_CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
}
if (!process.env.CLERK_SECRET_KEY) {
  console.warn('[Server] CLERK_SECRET_KEY not set. Using dev placeholder key.');
  process.env.CLERK_SECRET_KEY = 'sk_test_sample_clerk_key';
}
if (!process.env.CLERK_WEBHOOK_SECRET) {
  console.warn('[Server] CLERK_WEBHOOK_SECRET not set. Using dev placeholder key.');
  process.env.CLERK_WEBHOOK_SECRET = 'whsec_sample_webhook_secret';
}

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'VITE_CLERK_PUBLISHABLE_KEY is required'),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  console.warn('[Server] Environment warning:', envResult.error.format());
}

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // Trust reverse proxy (Cloud Run / Nginx) for accurate client IP resolution & rate limiting
  app.set('trust proxy', 1);

  // Connect to MongoDB Atlas (or local official instance)
  await connectToDatabase();

  // Security Headers: Configured for safe preview and iframe embedding
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      frameguard: false,
    })
  );

  // Compression & HTTP Request Logging
  app.use(compression());
  app.use(morgan('dev'));
  app.use(clerkMiddleware());

  // Rate Limiting: 200 requests per 15 minutes generally
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', generalLimiter);

  // Rate Limiting: 50 requests per 15 minutes on write routes
  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  });

  // 1. Clerk Webhook Route: REGISTERED BEFORE express.json() with express.raw
  app.post(
    '/api/webhooks/clerk',
    express.raw({ type: 'application/json' }),
    handleClerkWebhook
  );

  // 2. Standard JSON Body Parser for all other endpoints
  app.use(express.json());

  // 3. NoSQL Injection Guard: reject any request body key starting with "$"
  app.use((req: Request, res: Response, next: NextFunction) => {
    function sanitizeKeys(obj: any): boolean {
      if (!obj || typeof obj !== 'object') return false;
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) return true;
        if (typeof obj[key] === 'object' && sanitizeKeys(obj[key])) return true;
      }
      return false;
    }

    if (req.body && sanitizeKeys(req.body)) {
      res.status(400).json({
        success: false,
        message: 'Invalid request: keys starting with "$" are prohibited.',
      });
      return;
    }
    next();
  });

  // ============================================================================
  // API ROUTES
  // ============================================================================

  // Health check: reports MongoDB connection status via admin().ping() & counts
  app.get(['/health', '/api/health'], async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const pingResult = await db.admin().ping();
      const restaurantCount = await db.collection('restaurants').countDocuments();
      const menuItemCount = await db.collection('menuItems').countDocuments();

      res.json({
        success: true,
        status: 'ok',
        mongodb: {
          connected: true,
          ping: pingResult,
          database: db.databaseName,
          counts: {
            restaurants: restaurantCount,
            menuItems: menuItemCount,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        status: 'error',
        mongodb: {
          connected: false,
          error: err.message,
        },
      });
    }
  });

  // Location / Geolocation Resolver
  app.get('/api/location/resolve', (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude numbers are required',
      });
      return;
    }

    const result = resolveArea({ lat, lng });
    res.json({ success: true, data: result });
  });

  // Main domain routes
  app.use('/api/restaurants', restaurantRouter);
  app.use('/api/users', userRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', writeLimiter, orderRouter);
  app.use('/api/bookings', writeLimiter, bookingRouter);
  app.use('/api/admin', adminRouter);

  // ============================================================================
  // CENTRAL ERROR HANDLER
  // ============================================================================
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[API Error]', err);

    // Zod Validation Error
    if (err instanceof z.ZodError) {
      const issues = (err as any).issues || (err as any).errors || [];
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues.map((e: any) => ({
          field: (e.path || []).join('.'),
          message: e.message,
        })),
      });
      return;
    }

    // MongoDB Duplicate Key Error (E11000)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists.`,
      });
      return;
    }

    // Invalid ObjectId Error
    if (err.name === 'BSONError' || err.message?.includes('input must be a 24 character hex string')) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID format',
      });
      return;
    }

    // Generic Internal Error
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    });
  });

  // ============================================================================
  // FRONTEND INTEGRATION (Vite Middleware in Dev, Static Files in Prod)
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind exclusively to 0.0.0.0 and port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CraveDrop Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal crash during server startup:', err);
  process.exit(1);
});
