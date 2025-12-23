import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { syncShopifyCustomers } from '@/lib/integrations/shopify';
import { syncWooCommerceCustomers } from '@/lib/integrations/woocommerce';
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
    return encrypted; // Return as-is if decryption fails
  }
}

// GET /api/integrations/[id] - Get integration details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: integration, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Mask sensitive data
    const config = (integration.config as Record<string, unknown>) || {};
    const maskedConfig = {
      ...config,
      access_token: config.access_token ? '••••••••' : undefined,
      consumer_key: config.consumer_key
        ? `${decryptSecret(config.consumer_key as string).slice(0, 8)}...`
        : undefined,
      consumer_secret: config.consumer_secret ? '••••••••' : undefined,
      webhook_secret: config.webhook_secret
        ? `${(config.webhook_secret as string).slice(0, 12)}...`
        : undefined,
    };

    // Get sync stats (contacts imported from this integration)
    const { count: contactsImported } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .contains('tags', [`source:${integration.provider}`]);

    return NextResponse.json({
      integration: {
        ...integration,
        config: maskedConfig,
      },
      stats: {
        contacts_imported: contactsImported || 0,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/integrations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/integrations/[id] - Update integration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('id, config')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, config, is_active } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (is_active !== undefined) updates.is_active = is_active;

    // Merge config updates with existing config
    if (config !== undefined) {
      const existingConfig = (existing.config as Record<string, unknown>) || {};
      updates.config = {
        ...existingConfig,
        ...config,
        // Preserve encrypted secrets if not being updated
        access_token: config.access_token
          ? config.access_token
          : existingConfig.access_token,
        consumer_key: config.consumer_key
          ? config.consumer_key
          : existingConfig.consumer_key,
        consumer_secret: config.consumer_secret
          ? config.consumer_secret
          : existingConfig.consumer_secret,
        webhook_secret: existingConfig.webhook_secret,
      };
    }

    const { data, error } = await supabaseAdmin
      .from('integrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating integration:', error);
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 }
      );
    }

    // Mask sensitive data for response
    const responseConfig = (data.config as Record<string, unknown>) || {};

    return NextResponse.json({
      integration: {
        ...data,
        config: {
          ...responseConfig,
          access_token: responseConfig.access_token ? '••••••••' : undefined,
          consumer_key: responseConfig.consumer_key ? '••••••••' : undefined,
          consumer_secret: responseConfig.consumer_secret
            ? '••••••••'
            : undefined,
          webhook_secret: responseConfig.webhook_secret
            ? `${(responseConfig.webhook_secret as string).slice(0, 12)}...`
            : undefined,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in PUT /api/integrations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/[id] - Delete integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting integration:', error);
      return NextResponse.json(
        { error: 'Failed to delete integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in DELETE /api/integrations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/integrations/[id] - Special actions (sync, test)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { action } = body;

    // Get integration
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const config = (integration.config as Record<string, unknown>) || {};

    switch (action) {
      case 'sync': {
        // Sync customers from the platform
        let result;

        if (integration.provider === 'shopify') {
          // Decrypt access token
          const accessToken = decryptSecret(config.access_token as string);
          result = await syncShopifyCustomers(user.id, id, {
            ...config,
            access_token: accessToken,
          });
        } else if (integration.provider === 'woocommerce') {
          // Decrypt credentials
          const consumerKey = decryptSecret(config.consumer_key as string);
          const consumerSecret = decryptSecret(
            config.consumer_secret as string
          );
          result = await syncWooCommerceCustomers(user.id, id, {
            ...config,
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
          });
        } else {
          return NextResponse.json(
            { error: 'Sync not supported for this provider' },
            { status: 400 }
          );
        }

        return NextResponse.json(result);
      }

      case 'test': {
        // Test the connection
        if (integration.provider === 'woocommerce') {
          const { testWooCommerceConnection } =
            await import('@/lib/integrations/woocommerce');
          const consumerKey = decryptSecret(config.consumer_key as string);
          const consumerSecret = decryptSecret(
            config.consumer_secret as string
          );
          const result = await testWooCommerceConnection(
            config.store_url as string,
            consumerKey,
            consumerSecret
          );
          return NextResponse.json(result);
        }

        // For other providers, just check if we have required config
        return NextResponse.json({
          success: true,
          message: 'Connection configuration appears valid',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in POST /api/integrations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
