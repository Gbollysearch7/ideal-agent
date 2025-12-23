// E-commerce integration types and utilities

export const IntegrationProviders = {
  SHOPIFY: 'shopify',
  WOOCOMMERCE: 'woocommerce',
  STRIPE: 'stripe',
  CUSTOM: 'custom',
} as const;

export type IntegrationProvider =
  (typeof IntegrationProviders)[keyof typeof IntegrationProviders];

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  name: string;
  config: IntegrationConfig;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConfig {
  // Shopify
  shop_domain?: string;
  access_token?: string;
  webhook_secret?: string;

  // WooCommerce
  store_url?: string;
  consumer_key?: string;
  consumer_secret?: string;

  // Common settings
  sync_customers?: boolean;
  sync_orders?: boolean;
  auto_subscribe?: boolean;
  default_list_id?: string;
  tag_prefix?: string;
}

// Mapping of e-commerce events to email platform actions
export interface EcommerceEventMapping {
  event: string;
  action:
    | 'create_contact'
    | 'update_contact'
    | 'add_to_list'
    | 'add_tag'
    | 'trigger_automation';
  config?: Record<string, unknown>;
}

export const defaultEventMappings: EcommerceEventMapping[] = [
  {
    event: 'customer.created',
    action: 'create_contact',
    config: { auto_subscribe: true },
  },
  {
    event: 'customer.updated',
    action: 'update_contact',
  },
  {
    event: 'order.created',
    action: 'add_tag',
    config: { tag: 'customer' },
  },
  {
    event: 'order.fulfilled',
    action: 'add_tag',
    config: { tag: 'purchased' },
  },
  {
    event: 'cart.abandoned',
    action: 'trigger_automation',
    config: { automation_type: 'abandoned_cart' },
  },
];

// Helper to format e-commerce data to contact fields
export function mapCustomerToContact(
  provider: IntegrationProvider,
  customerData: Record<string, unknown>
): {
  email: string;
  first_name?: string;
  last_name?: string;
  metadata: Record<string, unknown>;
} {
  switch (provider) {
    case 'shopify':
      return {
        email: customerData.email as string,
        first_name: customerData.first_name as string,
        last_name: customerData.last_name as string,
        metadata: {
          source: 'shopify',
          shopify_id: customerData.id,
          phone: customerData.phone,
          total_spent: customerData.total_spent,
          orders_count: customerData.orders_count,
          accepts_marketing: customerData.accepts_marketing,
          created_at: customerData.created_at,
        },
      };

    case 'woocommerce':
      return {
        email: customerData.email as string,
        first_name: customerData.first_name as string,
        last_name: customerData.last_name as string,
        metadata: {
          source: 'woocommerce',
          woocommerce_id: customerData.id,
          username: customerData.username,
          is_paying_customer: customerData.is_paying_customer,
          avatar_url: customerData.avatar_url,
          created_at: customerData.date_created,
        },
      };

    default:
      return {
        email: customerData.email as string,
        first_name: customerData.first_name as string,
        last_name: customerData.last_name as string,
        metadata: {
          source: provider,
          ...customerData,
        },
      };
  }
}

// Helper to map order data to tags
export function mapOrderToTags(
  provider: IntegrationProvider,
  orderData: Record<string, unknown>,
  tagPrefix: string = ''
): string[] {
  const tags: string[] = [];
  const prefix = tagPrefix ? `${tagPrefix}:` : '';

  // Add source tag
  tags.push(`${prefix}source:${provider}`);

  // Add customer tag
  tags.push(`${prefix}customer`);

  // Add order-related tags based on provider
  switch (provider) {
    case 'shopify':
      if (orderData.financial_status) {
        tags.push(`${prefix}order:${orderData.financial_status}`);
      }
      if (orderData.fulfillment_status) {
        tags.push(`${prefix}fulfillment:${orderData.fulfillment_status}`);
      }
      if (orderData.tags) {
        const shopifyTags = (orderData.tags as string)
          .split(',')
          .map((t) => t.trim());
        shopifyTags.forEach((t) => tags.push(`${prefix}shopify:${t}`));
      }
      break;

    case 'woocommerce':
      if (orderData.status) {
        tags.push(`${prefix}order:${orderData.status}`);
      }
      break;
  }

  return tags;
}

// Calculate customer value tier based on spending
export function calculateValueTier(
  totalSpent: number,
  ordersCount: number
): 'vip' | 'loyal' | 'regular' | 'new' {
  if (totalSpent >= 1000 || ordersCount >= 10) return 'vip';
  if (totalSpent >= 500 || ordersCount >= 5) return 'loyal';
  if (ordersCount >= 2) return 'regular';
  return 'new';
}
