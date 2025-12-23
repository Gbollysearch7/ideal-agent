import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerWebhooks, WebhookEventTypes } from '@/lib/webhooks';
import {
  mapCustomerToContact,
  mapOrderToTags,
  calculateValueTier,
  IntegrationConfig,
} from './index';

// Shopify API base URL
const SHOPIFY_API_VERSION = '2024-01';

export interface ShopifyWebhookPayload {
  id: number;
  email?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Verify Shopify webhook signature
export function verifyShopifyWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
}

// Get Shopify API URL for a shop
export function getShopifyApiUrl(shopDomain: string, endpoint: string): string {
  const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${cleanDomain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
}

// Make authenticated request to Shopify API
export async function shopifyRequest(
  shopDomain: string,
  accessToken: string,
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): Promise<{ data?: unknown; error?: string }> {
  try {
    const url = getShopifyApiUrl(shopDomain, endpoint);
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Shopify API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Process Shopify customer webhook
export async function handleShopifyCustomerWebhook(
  userId: string,
  integrationId: string,
  config: IntegrationConfig,
  topic: string,
  payload: ShopifyWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!payload.email) {
      return { success: false, error: 'No email in customer data' };
    }

    const contactData = mapCustomerToContact('shopify', payload);

    switch (topic) {
      case 'customers/create': {
        // Check if contact already exists
        const { data: existingContact } = await supabaseAdmin
          .from('contacts')
          .select('id')
          .eq('user_id', userId)
          .eq('email', contactData.email)
          .single();

        if (existingContact) {
          // Update existing contact
          await supabaseAdmin
            .from('contacts')
            .update({
              first_name: contactData.first_name,
              last_name: contactData.last_name,
              metadata: contactData.metadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingContact.id);
        } else {
          // Create new contact
          const contactId = `con_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
          await supabaseAdmin.from('contacts').insert({
            id: contactId,
            user_id: userId,
            email: contactData.email,
            first_name: contactData.first_name,
            last_name: contactData.last_name,
            status: config.auto_subscribe ? 'SUBSCRIBED' : 'UNSUBSCRIBED',
            metadata: contactData.metadata,
            tags: [`source:shopify`, `shopify_id:${payload.id}`],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Add to default list if configured
          if (config.default_list_id) {
            await supabaseAdmin.from('list_contacts').insert({
              id: `lc_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
              list_id: config.default_list_id,
              contact_id: contactId,
              added_at: new Date().toISOString(),
            });
          }

          // Trigger webhook
          await triggerWebhooks(userId, WebhookEventTypes.CUSTOMER_CREATED, {
            source: 'shopify',
            customer: contactData,
          });
        }
        break;
      }

      case 'customers/update': {
        const { data: existingContact } = await supabaseAdmin
          .from('contacts')
          .select('id, metadata')
          .eq('user_id', userId)
          .eq('email', contactData.email)
          .single();

        if (existingContact) {
          const updatedMetadata = {
            ...((existingContact.metadata as Record<string, unknown>) || {}),
            ...contactData.metadata,
          };

          await supabaseAdmin
            .from('contacts')
            .update({
              first_name: contactData.first_name,
              last_name: contactData.last_name,
              metadata: updatedMetadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingContact.id);

          await triggerWebhooks(userId, WebhookEventTypes.CUSTOMER_UPDATED, {
            source: 'shopify',
            customer: contactData,
          });
        }
        break;
      }

      case 'customers/delete': {
        // We don't delete contacts, just mark them
        const { data: existingContact } = await supabaseAdmin
          .from('contacts')
          .select('id, tags')
          .eq('user_id', userId)
          .eq('email', contactData.email)
          .single();

        if (existingContact) {
          const currentTags = (existingContact.tags as string[]) || [];
          await supabaseAdmin
            .from('contacts')
            .update({
              tags: [...currentTags, 'shopify:deleted'],
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingContact.id);
        }
        break;
      }
    }

    // Update last sync time for integration
    await supabaseAdmin
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId);

    return { success: true };
  } catch (error) {
    console.error('Error handling Shopify customer webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Process Shopify order webhook
export async function handleShopifyOrderWebhook(
  userId: string,
  integrationId: string,
  config: IntegrationConfig,
  topic: string,
  payload: ShopifyWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const customerEmail =
      (payload.customer as { email?: string })?.email || payload.email;

    if (!customerEmail) {
      return { success: false, error: 'No customer email in order data' };
    }

    // Get or create contact
    let { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, tags, metadata')
      .eq('user_id', userId)
      .eq('email', customerEmail)
      .single();

    if (!contact) {
      // Create contact from order
      const contactId = `con_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
      const customer = (payload.customer as Record<string, unknown>) || {};

      const { data: newContact } = await supabaseAdmin
        .from('contacts')
        .insert({
          id: contactId,
          user_id: userId,
          email: customerEmail,
          first_name: customer.first_name as string,
          last_name: customer.last_name as string,
          status: 'SUBSCRIBED',
          metadata: {
            source: 'shopify',
            shopify_customer_id: customer.id,
          },
          tags: ['source:shopify', 'customer'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      contact = newContact;

      // Add to default list if configured
      if (config.default_list_id && contact) {
        await supabaseAdmin.from('list_contacts').insert({
          id: `lc_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
          list_id: config.default_list_id,
          contact_id: contact.id,
          added_at: new Date().toISOString(),
        });
      }
    }

    if (!contact) {
      return { success: false, error: 'Failed to get or create contact' };
    }

    // Calculate tags based on order
    const orderTags = mapOrderToTags('shopify', payload, config.tag_prefix);
    const currentTags = (contact.tags as string[]) || [];
    const newTags = [...new Set([...currentTags, ...orderTags])];

    // Calculate customer value tier
    const currentMetadata = (contact.metadata as Record<string, unknown>) || {};
    const totalSpent =
      ((currentMetadata.total_spent as number) || 0) +
      parseFloat((payload.total_price as string) || '0');
    const ordersCount = ((currentMetadata.orders_count as number) || 0) + 1;
    const valueTier = calculateValueTier(totalSpent, ordersCount);

    // Update contact with order info
    await supabaseAdmin
      .from('contacts')
      .update({
        tags: [...newTags, `tier:${valueTier}`],
        metadata: {
          ...currentMetadata,
          total_spent: totalSpent,
          orders_count: ordersCount,
          last_order_id: payload.id,
          last_order_at: payload.created_at,
          value_tier: valueTier,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact.id);

    // Trigger appropriate webhook based on topic
    const eventType =
      topic === 'orders/create'
        ? WebhookEventTypes.ORDER_CREATED
        : topic === 'orders/updated'
          ? WebhookEventTypes.ORDER_UPDATED
          : topic === 'orders/fulfilled'
            ? WebhookEventTypes.ORDER_FULFILLED
            : topic === 'orders/cancelled'
              ? WebhookEventTypes.ORDER_CANCELLED
              : null;

    if (eventType) {
      await triggerWebhooks(userId, eventType, {
        source: 'shopify',
        order_id: payload.id,
        customer_email: customerEmail,
        total_price: payload.total_price,
        line_items: payload.line_items,
      });
    }

    // Update last sync time for integration
    await supabaseAdmin
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId);

    return { success: true };
  } catch (error) {
    console.error('Error handling Shopify order webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Sync all customers from Shopify
export async function syncShopifyCustomers(
  userId: string,
  integrationId: string,
  config: IntegrationConfig
): Promise<{ success: boolean; synced: number; error?: string }> {
  if (!config.shop_domain || !config.access_token) {
    return { success: false, synced: 0, error: 'Missing Shopify credentials' };
  }

  let synced = 0;
  let nextPageUrl: string | null = 'customers.json?limit=250';

  try {
    while (nextPageUrl) {
      const { data, error } = await shopifyRequest(
        config.shop_domain,
        config.access_token,
        nextPageUrl
      );

      if (error) {
        return { success: false, synced, error };
      }

      const response = data as { customers: ShopifyWebhookPayload[] };

      for (const customer of response.customers || []) {
        await handleShopifyCustomerWebhook(
          userId,
          integrationId,
          config,
          'customers/create',
          customer
        );
        synced++;
      }

      // Handle pagination (Shopify uses Link headers, simplified here)
      nextPageUrl = null; // In production, parse Link header for next page
    }

    return { success: true, synced };
  } catch (error) {
    return {
      success: false,
      synced,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Register Shopify webhooks with the store
export async function registerShopifyWebhooks(
  shopDomain: string,
  accessToken: string,
  callbackUrl: string
): Promise<{ success: boolean; error?: string }> {
  const topics = [
    'customers/create',
    'customers/update',
    'customers/delete',
    'orders/create',
    'orders/updated',
    'orders/fulfilled',
    'orders/cancelled',
    'carts/create',
    'carts/update',
  ];

  try {
    for (const topic of topics) {
      const { error } = await shopifyRequest(
        shopDomain,
        accessToken,
        'webhooks.json',
        'POST',
        {
          webhook: {
            topic,
            address: `${callbackUrl}?topic=${encodeURIComponent(topic)}`,
            format: 'json',
          },
        }
      );

      if (error && !error.includes('already been taken')) {
        console.error(`Failed to register webhook for ${topic}:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
