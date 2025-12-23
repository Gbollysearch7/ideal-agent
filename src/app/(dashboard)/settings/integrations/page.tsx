'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  ShoppingCart,
  ExternalLink,
  Users,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Integration {
  id: string;
  provider: string;
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface IntegrationStats {
  contacts_imported: number;
}

const PROVIDER_INFO = {
  shopify: {
    name: 'Shopify',
    description: 'Connect your Shopify store to sync customers and orders',
    icon: ShoppingCart,
    color: 'bg-green-500',
    fields: [
      {
        key: 'shop_domain',
        label: 'Shop Domain',
        placeholder: 'your-store.myshopify.com',
        required: true,
      },
      {
        key: 'access_token',
        label: 'Access Token',
        placeholder: 'shpat_xxxxx',
        required: true,
        secret: true,
      },
    ],
  },
  woocommerce: {
    name: 'WooCommerce',
    description: 'Connect your WooCommerce store to sync customers and orders',
    icon: Store,
    color: 'bg-purple-500',
    fields: [
      {
        key: 'store_url',
        label: 'Store URL',
        placeholder: 'https://your-store.com',
        required: true,
      },
      {
        key: 'consumer_key',
        label: 'Consumer Key',
        placeholder: 'ck_xxxxx',
        required: true,
      },
      {
        key: 'consumer_secret',
        label: 'Consumer Secret',
        placeholder: 'cs_xxxxx',
        required: true,
        secret: true,
      },
    ],
  },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [integrationStats, setIntegrationStats] =
    useState<IntegrationStats | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [createdWebhookInfo, setCreatedWebhookInfo] = useState<{
    callback_url: string;
    webhook_secret: string;
  } | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations');
      const data = await response.json();
      if (response.ok) {
        setIntegrations(data.integrations || []);
      } else {
        toast.error(data.error || 'Failed to fetch integrations');
      }
    } catch (error) {
      toast.error('Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const fetchIntegrationDetails = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedIntegration(data.integration);
        setIntegrationStats(data.stats);
      }
    } catch (error) {
      toast.error('Failed to fetch integration details');
    }
  };

  const handleCreateIntegration = async () => {
    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    const providerInfo =
      PROVIDER_INFO[selectedProvider as keyof typeof PROVIDER_INFO];
    const missingFields = providerInfo.fields
      .filter((f) => f.required && !formData[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          name: formData.name || `My ${providerInfo.name} Store`,
          config: formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreatedWebhookInfo({
          callback_url: data.callback_url,
          webhook_secret: data.webhook_secret,
        });
        toast.success('Integration created successfully');
        fetchIntegrations();
      } else {
        toast.error(data.error || 'Failed to create integration');
      }
    } catch (error) {
      toast.error('Failed to create integration');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleIntegration = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !integration.is_active }),
      });

      if (response.ok) {
        toast.success(
          `Integration ${integration.is_active ? 'disabled' : 'enabled'}`
        );
        fetchIntegrations();
      }
    } catch (error) {
      toast.error('Failed to update integration');
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this integration? This will stop syncing data from this store.'
      )
    )
      return;

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Integration deleted');
        fetchIntegrations();
        if (selectedIntegration?.id === integrationId) {
          setSelectedIntegration(null);
        }
      }
    } catch (error) {
      toast.error('Failed to delete integration');
    }
  };

  const handleSyncIntegration = async (integrationId: string) => {
    setSyncing(integrationId);
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Synced ${data.synced} customers`);
        fetchIntegrations();
        if (selectedIntegration?.id === integrationId) {
          fetchIntegrationDetails(integrationId);
        }
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync integration');
    } finally {
      setSyncing(null);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(data.error || 'Connection test failed');
      }
    } catch (error) {
      toast.error('Failed to test connection');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(id);
    setTimeout(() => setCopiedValue(null), 2000);
    toast.success('Copied to clipboard');
  };

  const resetCreateForm = () => {
    setSelectedProvider('');
    setFormData({});
    setCreatedWebhookInfo(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your e-commerce platforms to sync customers and track
            purchases
          </p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
              <DialogDescription>
                Connect an e-commerce platform to sync customers and orders
              </DialogDescription>
            </DialogHeader>

            {createdWebhookInfo ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                  <div className="mb-2 flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Integration Created!</span>
                  </div>
                  <p className="mb-3 text-sm text-green-600 dark:text-green-400">
                    Save these details for configuring webhooks in your store.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Webhook URL
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="bg-muted flex-1 rounded p-2 text-xs break-all">
                        {createdWebhookInfo.callback_url}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          copyToClipboard(
                            createdWebhookInfo.callback_url,
                            'url'
                          )
                        }
                      >
                        {copiedValue === 'url' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Webhook Secret
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="bg-muted flex-1 rounded p-2 text-xs break-all">
                        {createdWebhookInfo.webhook_secret}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          copyToClipboard(
                            createdWebhookInfo.webhook_secret,
                            'secret'
                          )
                        }
                      >
                        {copiedValue === 'secret' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetCreateForm();
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-6">
                {!selectedProvider ? (
                  <div className="grid gap-4">
                    {Object.entries(PROVIDER_INFO).map(([key, provider]) => {
                      const Icon = provider.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedProvider(key)}
                          className="hover:border-primary flex items-center gap-4 rounded-lg border p-4 text-left transition-colors"
                        >
                          <div className={`rounded-lg p-3 ${provider.color}`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium">{provider.name}</h3>
                            <p className="text-muted-foreground text-sm">
                              {provider.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProvider('')}
                    >
                      ← Back to providers
                    </Button>

                    {PROVIDER_INFO[
                      selectedProvider as keyof typeof PROVIDER_INFO
                    ]?.fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>
                          {field.label}
                          {field.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        <Input
                          id={field.key}
                          type={field.secret ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formData[field.key] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}

                    <div className="space-y-2">
                      <Label htmlFor="name">Integration Name (optional)</Label>
                      <Input
                        id="name"
                        placeholder="My Store"
                        value={formData.name || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="auto_subscribe"
                            checked={formData.auto_subscribe === 'true'}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                auto_subscribe: checked ? 'true' : 'false',
                              }))
                            }
                          />
                          <label htmlFor="auto_subscribe" className="text-sm">
                            Auto-subscribe imported contacts
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sync_orders"
                            checked={formData.sync_orders !== 'false'}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                sync_orders: checked ? 'true' : 'false',
                              }))
                            }
                          />
                          <label htmlFor="sync_orders" className="text-sm">
                            Sync order data
                          </label>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateIntegration}
                        disabled={creating}
                      >
                        {creating && (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Connect
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Store className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">
                  No integrations yet
                </h3>
                <p className="text-muted-foreground mb-4 text-center">
                  Connect your e-commerce store to start syncing customers
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            integrations.map((integration) => {
              const providerInfo =
                PROVIDER_INFO[
                  integration.provider as keyof typeof PROVIDER_INFO
                ];
              const Icon = providerInfo?.icon || Store;

              return (
                <Card
                  key={integration.id}
                  className={`cursor-pointer transition-colors ${
                    selectedIntegration?.id === integration.id
                      ? 'border-primary'
                      : 'hover:border-muted-foreground/30'
                  }`}
                  onClick={() => fetchIntegrationDetails(integration.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${providerInfo?.color || 'bg-gray-500'}`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {integration.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {providerInfo?.name || integration.provider}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={integration.is_active}
                          onCheckedChange={() =>
                            handleToggleIntegration(integration)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={syncing === integration.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSyncIntegration(integration.id);
                          }}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              syncing === integration.id ? 'animate-spin' : ''
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteIntegration(integration.id);
                          }}
                        >
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      {typeof integration.config.shop_domain === 'string' && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {integration.config.shop_domain}
                        </span>
                      )}
                      {typeof integration.config.store_url === 'string' && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {integration.config.store_url.replace(
                            /^https?:\/\//,
                            ''
                          )}
                        </span>
                      )}
                      {integration.last_sync_at && (
                        <span>
                          Last sync:{' '}
                          {new Date(
                            integration.last_sync_at
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          {selectedIntegration ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Integration Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Users className="text-muted-foreground mx-auto mb-1 h-5 w-5" />
                    <div className="text-2xl font-bold">
                      {integrationStats?.contacts_imported || 0}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Contacts Imported
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Package className="text-muted-foreground mx-auto mb-1 h-5 w-5" />
                    <div className="text-2xl font-bold">
                      {selectedIntegration.is_active ? 'Active' : 'Paused'}
                    </div>
                    <div className="text-muted-foreground text-xs">Status</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleTestConnection(selectedIntegration.id)}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={syncing === selectedIntegration.id}
                    onClick={() =>
                      handleSyncIntegration(selectedIntegration.id)
                    }
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        syncing === selectedIntegration.id ? 'animate-spin' : ''
                      }`}
                    />
                    Sync Now
                  </Button>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">
                    Connected Since
                  </Label>
                  <p className="text-sm">
                    {new Date(
                      selectedIntegration.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>

                {selectedIntegration.last_sync_at && (
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Last Synced
                    </Label>
                    <p className="text-sm">
                      {new Date(
                        selectedIntegration.last_sync_at
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Store className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  Select an integration to view details
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Gets Synced</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                <div>
                  <span className="font-medium">Customers</span>
                  <p className="text-muted-foreground text-xs">
                    Email, name, and custom fields
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                <div>
                  <span className="font-medium">Orders</span>
                  <p className="text-muted-foreground text-xs">
                    Purchase history and order status
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                <div>
                  <span className="font-medium">Tags</span>
                  <p className="text-muted-foreground text-xs">
                    Auto-tags based on purchase behavior
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                <div>
                  <span className="font-medium">Customer Value</span>
                  <p className="text-muted-foreground text-xs">
                    Total spent and loyalty tier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
