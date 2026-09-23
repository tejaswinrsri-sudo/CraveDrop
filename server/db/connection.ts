import { MongoClient, Db } from 'mongodb';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

/**
 * Spawns local mongod daemon if port 27017 is not responding
 */
async function spawnLocalMongod(uri: string): Promise<void> {
  console.log('[Mongo] Local MongoDB instance not responding. Spawning background daemon...');
  const dataDir = path.resolve(process.cwd(), 'data/db');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const binaryPaths = [
    '/app/applet/node_modules/.cache/mongodb-memory-server/mongod-x64-debian-8.2.6',
    path.resolve(process.cwd(), 'node_modules/.cache/mongodb-memory-server/mongod-x64-debian-8.2.6'),
  ];

  let binary = binaryPaths.find((p) => fs.existsSync(p));
  if (!binary) {
    const cacheDir = path.resolve(process.cwd(), 'node_modules/.cache/mongodb-memory-server');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      const match = files.find((f) => f.startsWith('mongod-'));
      if (match) {
        binary = path.join(cacheDir, match);
      }
    }
  }

  if (binary) {
    console.log(`[Mongo] Starting mongod with binary ${binary}...`);
    const child = spawn(
      binary,
      ['--dbpath', dataDir, '--port', '27017', '--bind_ip', '127.0.0.1'],
      { detached: true, stdio: 'ignore' }
    );
    child.unref();

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const testClient = new MongoClient(uri, {
          directConnection: true,
          serverSelectionTimeoutMS: 800,
        });
        await testClient.connect();
        await testClient.close();
        console.log('[Mongo] Local MongoDB background daemon started successfully!');
        return;
      } catch {
        // keep waiting
      }
    }
  }
}

/**
 * Initializes and connects to the MongoDB database once at startup.
 * Returns the Db instance.
 */
export async function connectToDatabase(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL: MONGODB_URI environment variable is missing.');
    console.error('Please configure MONGODB_URI in your environment or .env file.');
    process.exit(1);
  }

  const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');
  const clientOptions = {
    directConnection: isLocal ? true : undefined,
    serverSelectionTimeoutMS: 5000,
  };

  try {
    console.log('[Mongo] Connecting to MongoDB...');
    client = new MongoClient(uri, clientOptions);
    await client.connect();
  } catch (err: any) {
    if (isLocal) {
      console.warn('[Mongo] Initial connect failed, attempting to start local daemon...');
      await spawnLocalMongod(uri);
      client = new MongoClient(uri, clientOptions);
      await client.connect();
    } else {
      console.warn(`[Mongo] Failed to connect to remote MongoDB URI (${err?.message || err}). Falling back to local MongoDB daemon...`);
      const localUri = 'mongodb://127.0.0.1:27017/food_booking';
      await spawnLocalMongod(localUri);
      client = new MongoClient(localUri, { directConnection: true, serverSelectionTimeoutMS: 5000 });
      await client.connect();
    }
  }

  try {
    // Verify connection
    await client.db('admin').command({ ping: 1 });
    console.log('[Mongo] Connected successfully to MongoDB server.');

    // Always use database 'food_booking' as specified in requirements
    dbInstance = client.db('food_booking');

    // Count restaurants and menuItems to log immediately on startup
    const restaurantCount = await dbInstance.collection('restaurants').countDocuments();
    const menuItemCount = await dbInstance.collection('menuItems').countDocuments();

    console.log(`[Mongo] Database: 'food_booking'`);
    console.log(`[Mongo] Collection 'restaurants' document count: ${restaurantCount}`);
    console.log(`[Mongo] Collection 'menuItems' document count: ${menuItemCount}`);

    return dbInstance;
  } catch (error) {
    console.error('FATAL: Failed to connect to MongoDB at', uri, error);
    process.exit(1);
  }
}

export function getDb(): Db {
  if (!dbInstance) {
    throw new Error('Database not initialized! Call connectToDatabase() first.');
  }
  return dbInstance;
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoClient not initialized! Call connectToDatabase() first.');
  }
  return client;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
  }
}
