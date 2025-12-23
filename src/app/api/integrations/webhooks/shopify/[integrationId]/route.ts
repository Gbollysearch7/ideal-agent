import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  verifyShopifyWebhook,
  handleShopifyCustomerWebhook,
  handleShopifyOrderWebhook,
} from '@/lib/integrations/shopify';
import crypto from 'crypto';

// Decrypt sensitive data
function decryptSecret(encrypted: string): string {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(
      process.env.NEXTAUTH_SECRET || 'default-secret',
      'salt',
      32
    );
    const [ivHex, encryptedData] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encrypted;
  }
}

// POST /api/integrations/webhooks/shopify/[integrationId]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;

    // Get raw body for signature verification
    const body = await request.text();

    // Get Shopify headers
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    const topic =
      request.headers.get('x-shopify-topic') ||
      request.nextUrl.searchParams.get('topic');

    if (!hmacHeader || !topic) {
      return NextResponse.json(
        { error: 'Missing required Shopify headers' },
        { status: 400 }
      );
    }

    // Get integration
    const { data: integration, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('provider', 'shopify')
      .eq('is_active', true)
      .single();

    if (error || !integration) {
      console.error('Integration not found:', integrationId);
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const config = integration.config as Record<string, unknown>;
    const webhookSecret = config.webhook_secret as string;

    // Verify webhook signature
    if (!verifyShopifyWebhook(body, hmacHeader, webhookSecret)) {
      console.error('Invalid Shopify webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    const payload = JSON.parse(body);

    // Handle different webhook topics
    let result;

    if (topic.startsWith('customers/')) {
      result = await handleShopifyCustomerWebhook(
        integration.user_id,
        integrationId,
        {
          ...config,
          access_token: config.access_token
            ? decryptSecret(config.access_token as string)
            : undefined,
        },
        topic,
        payload
      );
    } else if (topic.startsWith('orders/')) {
      result = await handleShopifyOrderWebhook(
        integration.user_id,
        integrationId,
        {
          ...config,
          access_token: config.access_token
            ? decryptSecret(config.access_token as string)
            : undefined,
        },
        topic,
        payload
      );
    } else if (topic.startsWith('carts/')) {
      // Handle cart events (for abandoned cart)
      // TODO: Implement cart tracking for abandoned cart automation
      result = { success: true, message: 'Cart event received' };
    } else {
      result = { success: true, message: `Unhandled topic: ${topic}` };
    }

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
