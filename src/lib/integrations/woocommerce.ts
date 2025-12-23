import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerWebhooks, WebhookEventTypes } from '@/lib/webhooks';
import {
  mapCustomerToContact,
  mapOrderToTags,
  calculateValueTier,
  IntegrationConfig,
} from './index';

export interface WooCommerceWebhookPayload {
  id: number;
  email?: string;
  billing?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  date_created?: string;
  date_modified?: string;
  [key: string]: unknown;
}

// Verify WooCommerce webhook signature
export function verifyWooCommerceWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return signature === hmac;
}

// Generate WooCommerce API authorization header
function getWooCommerceAuthHeader(
  consumerKey: string,
  consumerSecret: string
): string {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`;
}

// Make authenticated request to WooCommerce API
export async function wooCommerceRequest(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): Promise<{ data?: unknown; error?: string }> {
  try {
    const cleanUrl = storeUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/wp-json/wc/v3/${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: getWooCommerceAuthHeader(consumerKey, consumerSecret),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `WooCommerce API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Process WooCommerce customer webhook
export async function handleWooCommerceCustomerWebhook(
  userId: string,
  integrationId: string,
  config: IntegrationConfig,
  topic: string,
  payload: WooCommerceWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!payload.email) {
      return { success: false, error: 'No email in customer data' };
    }

    const contactData = mapCustomerToContact('woocommerce', payload);

    switch (topic) {
      case 'customer.created': {
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
            tags: [`source:woocommerce`, `woocommerce_id:${payload.id}`],
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
            source: 'woocommerce',
            customer: contactData,
          });
        }
        break;
      }

      case 'customer.updated': {
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
            source: 'woocommerce',
            customer: contactData,
          });
        }
        break;
      }

      case 'customer.deleted': {
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
              tags: [...currentTags, 'woocommerce:deleted'],
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
    console.error('Error handling WooCommerce customer webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Process WooCommerce order webhook
export async function handleWooCommerceOrderWebhook(
  userId: string,
  integrationId: string,
  config: IntegrationConfig,
  topic: string,
  payload: WooCommerceWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const customerEmail = payload.billing?.email || payload.email;

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
      const billing = payload.billing || {};

      const { data: newContact } = await supabaseAdmin
        .from('contacts')
        .insert({
          id: contactId,
          user_id: userId,
          email: customerEmail,
          first_name: billing.first_name as string,
          last_name: billing.last_name as string,
          status: 'SUBSCRIBED',
          metadata: {
            source: 'woocommerce',
            woocommerce_customer_id: payload.customer_id,
          },
          tags: ['source:woocommerce', 'customer'],
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
    const orderTags = mapOrderToTags('woocommerce', payload, config.tag_prefix);
    const currentTags = (contact.tags as string[]) || [];
    const newTags = [...new Set([...currentTags, ...orderTags])];

    // Calculate customer value tier
    const currentMetadata = (contact.metadata as Record<string, unknown>) || {};
    const orderTotal = parseFloat((payload.total as string) || '0');
    const totalSpent =
      ((currentMetadata.total_spent as number) || 0) + orderTotal;
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
          last_order_at: payload.date_created,
          value_tier: valueTier,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact.id);

    // Trigger appropriate webhook based on topic
    const eventType =
      topic === 'order.created'
        ? WebhookEventTypes.ORDER_CREATED
        : topic === 'order.updated'
          ? WebhookEventTypes.ORDER_UPDATED
          : topic === 'order.completed'
            ? WebhookEventTypes.ORDER_FULFILLED
            : topic === 'order.cancelled'
              ? WebhookEventTypes.ORDER_CANCELLED
              : null;

    if (eventType) {
      await triggerWebhooks(userId, eventType, {
        source: 'woocommerce',
        order_id: payload.id,
        customer_email: customerEmail,
        total: payload.total,
        line_items: payload.line_items,
        status: payload.status,
      });
    }

    // Update last sync time for integration
    await supabaseAdmin
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId);

    return { success: true };
  } catch (error) {
    console.error('Error handling WooCommerce order webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Sync all customers from WooCommerce
export async function syncWooCommerceCustomers(
  userId: string,
  integrationId: string,
  config: IntegrationConfig
): Promise<{ success: boolean; synced: number; error?: string }> {
  if (!config.store_url || !config.consumer_key || !config.consumer_secret) {
    return {
      success: false,
      synced: 0,
      error: 'Missing WooCommerce credentials',
    };
  }

  let synced = 0;
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const { data, error } = await wooCommerceRequest(
        config.store_url,
        config.consumer_key,
        config.consumer_secret,
        `customers?page=${page}&per_page=${perPage}`
      );

      if (error) {
        return { success: false, synced, error };
      }

      const customers = data as WooCommerceWebhookPayload[];

      if (!customers || customers.length === 0) {
        break;
      }

      for (const customer of customers) {
        await handleWooCommerceCustomerWebhook(
          userId,
          integrationId,
          config,
          'customer.created',
          customer
        );
        synced++;
      }

      if (customers.length < perPage) {
        break;
      }

      page++;
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

// Test WooCommerce connection
export async function testWooCommerceConnection(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<{
  success: boolean;
  error?: string;
  storeInfo?: Record<string, unknown>;
}> {
  const { data, error } = await wooCommerceRequest(
    storeUrl,
    consumerKey,
    consumerSecret,
    'system_status'
  );

  if (error) {
    return { success: false, error };
  }

  const systemStatus = data as { environment?: { version?: string } };

  return {
    success: true,
    storeInfo: {
      wc_version: systemStatus.environment?.version,
    },
  };
}

// Register WooCommerce webhooks with the store
export async function registerWooCommerceWebhooks(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): Promise<{ success: boolean; error?: string }> {
  const topics = [
    { name: 'Customer Created', topic: 'customer.created' },
    { name: 'Customer Updated', topic: 'customer.updated' },
    { name: 'Customer Deleted', topic: 'customer.deleted' },
    { name: 'Order Created', topic: 'order.created' },
    { name: 'Order Updated', topic: 'order.updated' },
    { name: 'Order Completed', topic: 'order.completed' },
    { name: 'Order Cancelled', topic: 'order.cancelled' },
  ];

  try {
    for (const { name, topic } of topics) {
      const { error } = await wooCommerceRequest(
        storeUrl,
        consumerKey,
        consumerSecret,
        'webhooks',
        'POST',
        {
          name: `Email Platform - ${name}`,
          topic,
          delivery_url: `${callbackUrl}?topic=${encodeURIComponent(topic)}`,
          status: 'active',
        }
      );

      if (error && !error.includes('already exists')) {
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
