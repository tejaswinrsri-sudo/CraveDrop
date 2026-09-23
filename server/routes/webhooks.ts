import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/connection';

/**
 * Handles Clerk Webhooks (user.created, user.updated, user.deleted)
 * Registered before express.json() with express.raw({ type: 'application/json' })
 */
export async function handleClerkWebhook(req: Request, res: Response): Promise<void> {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[Webhook] CLERK_WEBHOOK_SECRET is not configured.');
    res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    return;
  }

  // Get the headers
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.warn('[Webhook] Missing required svix headers');
    res.status(400).json({ success: false, message: 'Missing svix verification headers' });
    return;
  }

  const payload = req.body;
  const bodyString = payload instanceof Buffer ? payload.toString('utf8') : JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(bodyString, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err: any) {
    console.error('[Webhook] Svix verification failed:', err.message);
    res.status(400).json({ success: false, message: 'Webhook verification failed' });
    return;
  }

  const eventType = evt.type;
  console.log(`[Webhook] Received Clerk webhook event: '${eventType}' for ID: ${evt.data?.id}`);

  const db = getDb();
  const usersCol = db.collection('users');
  const cartsCol = db.collection('carts');

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const data = evt.data;
      const clerkId = data.id;
      const primaryEmail =
        data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)?.email_address ||
        data.email_addresses?.[0]?.email_address ||
        '';

      const name =
        `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
        data.username ||
        'CraveDrop Customer';

      const imageUrl = data.image_url || '';
      const role = (data.public_metadata?.role as string) === 'admin' ? 'admin' : 'customer';

      const now = new Date();

      await usersCol.updateOne(
        { clerkId },
        {
          $set: {
            name,
            email: primaryEmail.toLowerCase(),
            imageUrl,
            role,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            clerkId,
            phone: '',
            addresses: [],
            createdAt: now,
          },
        },
        { upsert: true }
      );

      console.log(
        `[Webhook] Successfully processed ${eventType}: user ${clerkId} (${primaryEmail}, role=${role}) saved to MongoDB`
      );
    } else if (eventType === 'user.deleted') {
      const clerkId = evt.data?.id;
      if (clerkId) {
        const user = await usersCol.findOne({ clerkId });
        if (user) {
          // Delete user document
          await usersCol.deleteOne({ clerkId });
          // Delete their cart document
          await cartsCol.deleteOne({ userId: user._id });
          console.log(
            `[Webhook] Successfully processed user.deleted: removed user ${clerkId} and associated cart (orders retained)`
          );
        }
      }
    }

    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (dbError) {
    console.error(`[Webhook] Database error while processing ${eventType}:`, dbError);
    res.status(500).json({ success: false, message: 'Internal server error processing webhook' });
  }
}
