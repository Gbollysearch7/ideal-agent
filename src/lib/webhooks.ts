import crypto from 'crypto';
import { supabaseAdmin } from './supabase';

// Webhook event types
export const WebhookEventTypes = {
  // Contact events
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  CONTACT_DELETED: 'contact.deleted',
  CONTACT_SUBSCRIBED: 'contact.subscribed',
  CONTACT_UNSUBSCRIBED: 'contact.unsubscribed',

  // List events
  LIST_CREATED: 'list.created',
  LIST_UPDATED: 'list.updated',
  LIST_DELETED: 'list.deleted',
  CONTACT_ADDED_TO_LIST: 'list.contact_added',
  CONTACT_REMOVED_FROM_LIST: 'list.contact_removed',

  // Campaign events
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_SENT: 'campaign.sent',
  CAMPAIGN_COMPLETED: 'campaign.completed',

  // Email events
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_OPENED: 'email.opened',
  EMAIL_CLICKED: 'email.clicked',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_COMPLAINED: 'email.complained',

  // E-commerce events (incoming from integrations)
  ORDER_CREATED: 'ecommerce.order_created',
  ORDER_UPDATED: 'ecommerce.order_updated',
  ORDER_FULFILLED: 'ecommerce.order_fulfilled',
  ORDER_CANCELLED: 'ecommerce.order_cancelled',
  CART_ABANDONED: 'ecommerce.cart_abandoned',
  CUSTOMER_CREATED: 'ecommerce.customer_created',
  CUSTOMER_UPDATED: 'ecommerce.customer_updated',
  PRODUCT_PURCHASED: 'ecommerce.product_purchased',
} as const;

export type WebhookEventType =
  (typeof WebhookEventTypes)[keyof typeof WebhookEventTypes];

// Webhook payload structure
export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  created_at: string;
  data: Record<string, unknown>;
}

// Webhook delivery status
export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  last_attempt_at: string | null;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
}

// Generate webhook signature
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

// Verify webhook signature (for incoming webhooks)
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): boolean {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = parseInt(timestampPart.slice(2), 10);
    const providedSignature = signaturePart.slice(3);

    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      return false;
    }

    // Verify signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Get all active webhooks for a user subscribed to an event
export async function getWebhooksForEvent(
  userId: string,
  eventType: WebhookEventType
): Promise<
  Array<{ id: string; url: string; secret: string; events: string[] }>
> {
  const { data: webhooks, error } = await supabaseAdmin
    .from('webhooks')
    .select('id, url, secret, events')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !webhooks) {
    console.error('Error fetching webhooks:', error);
    return [];
  }

  // Filter webhooks that are subscribed to this event or all events (*)
  return webhooks.filter(
    (webhook) =>
      webhook.events.includes(eventType) || webhook.events.includes('*')
  );
}

// Send webhook to a single endpoint
async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string
): Promise<{
  success: boolean;
  status?: number;
  body?: string;
  error?: string;
}> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = generateWebhookSignature(payloadString, secret);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Id': payload.id,
        'X-Webhook-Event': payload.event,
        'User-Agent': 'EmailPlatform-Webhook/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const body = await response.text();

    return {
      success: response.ok,
      status: response.status,
      body: body.slice(0, 1000), // Limit response body storage
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Record webhook delivery attempt
async function recordWebhookDelivery(
  webhookId: string,
  eventType: string,
  payload: WebhookPayload,
  result: { success: boolean; status?: number; body?: string; error?: string },
  attempts: number,
  deliveryId?: string
): Promise<string> {
  const id =
    deliveryId || `whd_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

  const { error } = await supabaseAdmin.from('webhook_deliveries').upsert({
    id,
    webhook_id: webhookId,
    event_type: eventType,
    payload,
    status: result.success ? 'success' : attempts >= 3 ? 'failed' : 'pending',
    attempts,
    last_attempt_at: new Date().toISOString(),
    response_status: result.status || null,
    response_body: result.body || null,
    error_message: result.error || null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Error recording webhook delivery:', error);
  }

  return id;
}

// Trigger webhooks for an event
export async function triggerWebhooks(
  userId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await getWebhooksForEvent(userId, eventType);

  if (webhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
    event: eventType,
    created_at: new Date().toISOString(),
    data,
  };

  // Send webhooks in parallel
  const deliveryPromises = webhooks.map(async (webhook) => {
    const result = await sendWebhook(webhook.url, payload, webhook.secret);
    await recordWebhookDelivery(webhook.id, eventType, payload, result, 1);

    // Schedule retry if failed
    if (!result.success) {
      // In production, this would use a job queue
      // For now, we'll do simple in-process retries
      scheduleRetry(webhook.id, webhook.url, webhook.secret, payload, 1);
    }
  });

  await Promise.allSettled(deliveryPromises);
}

// Simple retry mechanism (in production, use a proper job queue)
async function scheduleRetry(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
  attempt: number
): Promise<void> {
  if (attempt >= 3) {
    return; // Max retries reached
  }

  // Exponential backoff: 1min, 5min, 15min
  const delays = [60000, 300000, 900000];
  const delay = delays[attempt - 1] || delays[delays.length - 1];

  setTimeout(async () => {
    const result = await sendWebhook(url, payload, secret);
    await recordWebhookDelivery(
      webhookId,
      payload.event,
      payload,
      result,
      attempt + 1
    );

    if (!result.success && attempt + 1 < 3) {
      scheduleRetry(webhookId, url, secret, payload, attempt + 1);
    }
  }, delay);
}

// Generate a secure webhook secret
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

// Test a webhook endpoint
export async function testWebhook(
  url: string,
  secret: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const testPayload: WebhookPayload = {
    id: `evt_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
    event: 'contact.created' as WebhookEventType,
    created_at: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test webhook from Email Platform',
    },
  };

  return sendWebhook(url, testPayload, secret);
}
