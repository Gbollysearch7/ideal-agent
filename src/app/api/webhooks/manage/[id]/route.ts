import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  generateWebhookSecret,
  testWebhook,
  WebhookEventTypes,
} from '@/lib/webhooks';

// GET /api/webhooks/manage/[id] - Get webhook details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Get recent deliveries
    const { data: deliveries } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get stats
    const { count: totalDeliveries } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_id', id);

    const { count: successDeliveries } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_id', id)
      .eq('status', 'success');

    const { count: failedDeliveries } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_id', id)
      .eq('status', 'failed');

    return NextResponse.json({
      webhook: {
        ...webhook,
        secret: webhook.secret.slice(0, 12) + '...',
      },
      deliveries: deliveries || [],
      stats: {
        total: totalDeliveries || 0,
        success: successDeliveries || 0,
        failed: failedDeliveries || 0,
        success_rate:
          totalDeliveries && totalDeliveries > 0
            ? Math.round(((successDeliveries || 0) / totalDeliveries) * 100)
            : 0,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/webhooks/manage/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks/manage/[id] - Update webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const body = await request.json();
    const { url, events, name, description, is_active } = body;

    const updates: Record<string, unknown> = {};

    // Validate and add URL if provided
    if (url !== undefined) {
      try {
        new URL(url);
        updates.url = url;
      } catch {
        return NextResponse.json(
          { error: 'Invalid webhook URL' },
          { status: 400 }
        );
      }
    }

    // Validate and add events if provided
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
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

      updates.events = events;
    }

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating webhook:', error);
      return NextResponse.json(
        { error: 'Failed to update webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      webhook: {
        ...data,
        secret: data.secret.slice(0, 12) + '...',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in PUT /api/webhooks/manage/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/manage/[id] - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Delete webhook (deliveries will be cascade deleted if FK exists)
    const { error } = await supabaseAdmin
      .from('webhooks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting webhook:', error);
      return NextResponse.json(
        { error: 'Failed to delete webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in DELETE /api/webhooks/manage/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/webhooks/manage/[id] - Special actions (test, rotate secret)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { action } = body;

    // Get webhook
    const { data: webhook, error: fetchError } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    switch (action) {
      case 'test': {
        const result = await testWebhook(webhook.url, webhook.secret);
        return NextResponse.json({
          success: result.success,
          status: result.status,
          error: result.error,
        });
      }

      case 'rotate_secret': {
        const newSecret = generateWebhookSecret();
        const { error } = await supabaseAdmin
          .from('webhooks')
          .update({ secret: newSecret })
          .eq('id', id);

        if (error) {
          return NextResponse.json(
            { error: 'Failed to rotate secret' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          secret: newSecret,
          message: 'Secret rotated successfully. Save the new secret.',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in POST /api/webhooks/manage/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
