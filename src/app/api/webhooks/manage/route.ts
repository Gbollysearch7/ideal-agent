import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  generateWebhookSecret,
  testWebhook,
  WebhookEventTypes,
} from '@/lib/webhooks';
import { v4 as uuidv4 } from 'uuid';

// GET /api/webhooks/manage - List all user webhooks
export async function GET() {
  try {
    const user = await requireAuth();

    const { data: webhooks, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      );
    }

    // Get delivery stats for each webhook
    const webhooksWithStats = await Promise.all(
      (webhooks || []).map(async (webhook) => {
        const { count: totalDeliveries } = await supabaseAdmin
          .from('webhook_deliveries')
          .select('*', { count: 'exact', head: true })
          .eq('webhook_id', webhook.id);

        const { count: failedDeliveries } = await supabaseAdmin
          .from('webhook_deliveries')
          .select('*', { count: 'exact', head: true })
          .eq('webhook_id', webhook.id)
          .eq('status', 'failed');

        const { data: lastDelivery } = await supabaseAdmin
          .from('webhook_deliveries')
          .select('created_at, status')
          .eq('webhook_id', webhook.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...webhook,
          // Hide the full secret, only show prefix
          secret: webhook.secret.slice(0, 12) + '...',
          stats: {
            total_deliveries: totalDeliveries || 0,
            failed_deliveries: failedDeliveries || 0,
            last_delivery: lastDelivery?.created_at || null,
            last_status: lastDelivery?.status || null,
          },
        };
      })
    );

    return NextResponse.json({
      webhooks: webhooksWithStats,
      available_events: Object.values(WebhookEventTypes),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/webhooks/manage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/webhooks/manage - Create a new webhook
export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { url, events, name, description } = body;

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event type is required' },
        { status: 400 }
      );
    }

    const validEvents = Object.values(WebhookEventTypes);
    const invalidEvents = events.filter(
      (e: string) =>
        e !== '*' && !validEvents.includes(e as (typeof validEvents)[number])
    );

    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = generateWebhookSecret();
    const webhookId = uuidv4();

    // Test the webhook endpoint before saving
    const testResult = await testWebhook(url, secret);
    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Webhook endpoint test failed',
          details: testResult.error || `Status: ${testResult.status}`,
        },
        { status: 400 }
      );
    }

    // Create webhook
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .insert({
        id: webhookId,
        user_id: user.id,
        url,
        events,
        name: name || 'My Webhook',
        description: description || null,
        secret,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return NextResponse.json(
        { error: 'Failed to create webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        webhook: {
          ...data,
          // Return the full secret only on creation
          secret,
        },
        message:
          'Webhook created successfully. Save the secret - it will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in POST /api/webhooks/manage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
