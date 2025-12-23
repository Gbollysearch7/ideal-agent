import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  verifyWooCommerceWebhook,
  handleWooCommerceCustomerWebhook,
  handleWooCommerceOrderWebhook,
} from '@/lib/integrations/woocommerce';
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

// POST /api/integrations/webhooks/woocommerce/[integrationId]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;

    // Get raw body for signature verification
    const body = await request.text();

    // Get WooCommerce headers
    const signature = request.headers.get('x-wc-webhook-signature');
    const topic =
      request.headers.get('x-wc-webhook-topic') ||
      request.nextUrl.searchParams.get('topic');

    if (!signature || !topic) {
      return NextResponse.json(
        { error: 'Missing required WooCommerce headers' },
        { status: 400 }
      );
    }

    // Get integration
    const { data: integration, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('provider', 'woocommerce')
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
    if (!verifyWooCommerceWebhook(body, signature, webhookSecret)) {
      console.error('Invalid WooCommerce webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    const payload = JSON.parse(body);

    // Prepare decrypted config
    const decryptedConfig = {
      ...config,
      consumer_key: config.consumer_key
        ? decryptSecret(config.consumer_key as string)
        : undefined,
      consumer_secret: config.consumer_secret
        ? decryptSecret(config.consumer_secret as string)
        : undefined,
    };

    // Handle different webhook topics
    let result;

    if (topic.startsWith('customer.')) {
      result = await handleWooCommerceCustomerWebhook(
        integration.user_id,
        integrationId,
        decryptedConfig,
        topic,
        payload
      );
    } else if (topic.startsWith('order.')) {
      result = await handleWooCommerceOrderWebhook(
        integration.user_id,
        integrationId,
        decryptedConfig,
        topic,
        payload
      );
    } else {
      result = { success: true, message: `Unhandled topic: ${topic}` };
    }

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing WooCommerce webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
