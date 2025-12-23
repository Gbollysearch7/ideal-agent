import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { IntegrationProviders } from '@/lib/integrations';
import {
  testWooCommerceConnection,
  registerWooCommerceWebhooks,
} from '@/lib/integrations/woocommerce';
import { registerShopifyWebhooks } from '@/lib/integrations/shopify';
import { generateWebhookSecret } from '@/lib/webhooks';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Encrypt sensitive data
function encryptSecret(value: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(
    process.env.NEXTAUTH_SECRET || 'default-secret',
    'salt',
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// GET /api/integrations - List all user integrations
export async function GET() {
  try {
    const user = await requireAuth();

    const { data: integrations, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching integrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }

    // Mask sensitive data
    const maskedIntegrations = (integrations || []).map((integration) => {
      const config = (integration.config as Record<string, unknown>) || {};
      return {
        ...integration,
        config: {
          ...config,
          access_token: config.access_token ? '••••••••' : undefined,
          consumer_key: config.consumer_key
            ? `${(config.consumer_key as string).slice(0, 8)}...`
            : undefined,
          consumer_secret: config.consumer_secret ? '••••••••' : undefined,
          webhook_secret: config.webhook_secret
            ? `${(config.webhook_secret as string).slice(0, 12)}...`
            : undefined,
        },
      };
    });

    return NextResponse.json({
      integrations: maskedIntegrations,
      available_providers: Object.values(IntegrationProviders),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/integrations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/integrations - Create a new integration
export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { provider, name, config } = body;

    // Validate provider
    if (!provider || !Object.values(IntegrationProviders).includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid integration provider' },
        { status: 400 }
      );
    }

    // Validate config based on provider
    switch (provider) {
      case 'shopify': {
        if (!config?.shop_domain || !config?.access_token) {
          return NextResponse.json(
            { error: 'Shop domain and access token are required for Shopify' },
            { status: 400 }
          );
        }
        break;
      }

      case 'woocommerce': {
        if (
          !config?.store_url ||
          !config?.consumer_key ||
          !config?.consumer_secret
        ) {
          return NextResponse.json(
            {
              error:
                'Store URL, consumer key, and consumer secret are required for WooCommerce',
            },
            { status: 400 }
          );
        }

        // Test the connection
        const testResult = await testWooCommerceConnection(
          config.store_url,
          config.consumer_key,
          config.consumer_secret
        );

        if (!testResult.success) {
          return NextResponse.json(
            { error: `Failed to connect to WooCommerce: ${testResult.error}` },
            { status: 400 }
          );
        }
        break;
      }
    }

    // Generate webhook secret for incoming webhooks
    const webhookSecret = generateWebhookSecret();

    // Encrypt sensitive data
    const encryptedConfig: Record<string, unknown> = {
      ...config,
      webhook_secret: webhookSecret,
    };

    if (config.access_token) {
      encryptedConfig.access_token = encryptSecret(config.access_token);
    }
    if (config.consumer_key) {
      encryptedConfig.consumer_key = encryptSecret(config.consumer_key);
    }
    if (config.consumer_secret) {
      encryptedConfig.consumer_secret = encryptSecret(config.consumer_secret);
    }

    const integrationId = uuidv4();
    const now = new Date().toISOString();

    // Create integration
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .insert({
        id: integrationId,
        user_id: user.id,
        provider,
        name:
          name ||
          `My ${provider.charAt(0).toUpperCase() + provider.slice(1)} Store`,
        config: encryptedConfig,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating integration:', error);
      return NextResponse.json(
        { error: 'Failed to create integration' },
        { status: 500 }
      );
    }

    // Generate callback URL for webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/integrations/webhooks/${provider}/${integrationId}`;

    // Register webhooks with the platform
    let webhookRegistration: { success: boolean; error?: string } = {
      success: true,
    };

    if (provider === 'shopify' && config.shop_domain && config.access_token) {
      webhookRegistration = await registerShopifyWebhooks(
        config.shop_domain,
        config.access_token,
        callbackUrl
      );
    } else if (
      provider === 'woocommerce' &&
      config.store_url &&
      config.consumer_key &&
      config.consumer_secret
    ) {
      webhookRegistration = await registerWooCommerceWebhooks(
        config.store_url,
        config.consumer_key,
        config.consumer_secret,
        callbackUrl
      );
    }

    return NextResponse.json(
      {
        integration: {
          ...data,
          config: {
            ...config,
            access_token: config.access_token ? '••••••••' : undefined,
            consumer_key: config.consumer_key
              ? `${config.consumer_key.slice(0, 8)}...`
              : undefined,
            consumer_secret: config.consumer_secret ? '••••••••' : undefined,
            webhook_secret: webhookSecret,
          },
        },
        callback_url: callbackUrl,
        webhook_secret: webhookSecret,
        webhook_registration: webhookRegistration,
        message:
          'Integration created successfully. Save the webhook secret for verification.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in POST /api/integrations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
