'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCw,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface WebhookData {
  id: string;
  url: string;
  name?: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
  stats: {
    total_deliveries: number;
    failed_deliveries: number;
    last_delivery: string | null;
    last_status: string | null;
  };
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  response_status: number | null;
  created_at: string;
}

const EVENT_CATEGORIES = {
  'Contact Events': [
    { value: 'contact.created', label: 'Contact Created' },
    { value: 'contact.updated', label: 'Contact Updated' },
    { value: 'contact.deleted', label: 'Contact Deleted' },
    { value: 'contact.subscribed', label: 'Contact Subscribed' },
    { value: 'contact.unsubscribed', label: 'Contact Unsubscribed' },
  ],
  'List Events': [
    { value: 'list.created', label: 'List Created' },
    { value: 'list.updated', label: 'List Updated' },
    { value: 'list.deleted', label: 'List Deleted' },
    { value: 'list.contact_added', label: 'Contact Added to List' },
    { value: 'list.contact_removed', label: 'Contact Removed from List' },
  ],
  'Campaign Events': [
    { value: 'campaign.created', label: 'Campaign Created' },
    { value: 'campaign.sent', label: 'Campaign Sent' },
    { value: 'campaign.completed', label: 'Campaign Completed' },
  ],
  'Email Events': [
    { value: 'email.sent', label: 'Email Sent' },
    { value: 'email.delivered', label: 'Email Delivered' },
    { value: 'email.opened', label: 'Email Opened' },
    { value: 'email.clicked', label: 'Email Clicked' },
    { value: 'email.bounced', label: 'Email Bounced' },
    { value: 'email.complained', label: 'Email Complained' },
  ],
  'E-commerce Events': [
    { value: 'ecommerce.order_created', label: 'Order Created' },
    { value: 'ecommerce.order_fulfilled', label: 'Order Fulfilled' },
    { value: 'ecommerce.order_cancelled', label: 'Order Cancelled' },
    { value: 'ecommerce.cart_abandoned', label: 'Cart Abandoned' },
    { value: 'ecommerce.customer_created', label: 'Customer Created' },
  ],
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(
    null
  );
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // Form state
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch('/api/webhooks/manage');
      const data = await response.json();
      if (response.ok) {
        setWebhooks(data.webhooks || []);
      } else {
        toast.error(data.error || 'Failed to fetch webhooks');
      }
    } catch (error) {
      toast.error('Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const fetchWebhookDetails = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks/manage/${webhookId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedWebhook(data.webhook);
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      toast.error('Failed to fetch webhook details');
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.url || newWebhook.events.length === 0) {
      toast.error('URL and at least one event are required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/webhooks/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook),
      });

      const data = await response.json();

      if (response.ok) {
        setCreatedSecret(data.webhook.secret);
        toast.success('Webhook created successfully');
        fetchWebhooks();
      } else {
        toast.error(data.error || 'Failed to create webhook');
      }
    } catch (error) {
      toast.error('Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleWebhook = async (webhook: WebhookData) => {
    try {
      const response = await fetch(`/api/webhooks/manage/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !webhook.is_active }),
      });

      if (response.ok) {
        toast.success(`Webhook ${webhook.is_active ? 'disabled' : 'enabled'}`);
        fetchWebhooks();
      }
    } catch (error) {
      toast.error('Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/webhooks/manage/${webhookId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Webhook deleted');
        fetchWebhooks();
        if (selectedWebhook?.id === webhookId) {
          setSelectedWebhook(null);
        }
      }
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks/manage/${webhookId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Test webhook sent successfully');
      } else {
        toast.error(`Test failed: ${data.error || `Status ${data.status}`}`);
      }
    } catch (error) {
      toast.error('Failed to send test webhook');
    }
  };

  const handleRotateSecret = async (webhookId: string) => {
    if (
      !confirm(
        'Are you sure you want to rotate the webhook secret? You will need to update your endpoint.'
      )
    )
      return;

    try {
      const response = await fetch(`/api/webhooks/manage/${webhookId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate_secret' }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Secret rotated successfully');
        setCreatedSecret(data.secret);
      } else {
        toast.error(data.error || 'Failed to rotate secret');
      }
    } catch (error) {
      toast.error('Failed to rotate secret');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(id);
    setTimeout(() => setCopiedSecret(null), 2000);
    toast.success('Copied to clipboard');
  };

  const toggleEvent = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const selectAllEvents = () => {
    const allEvents = Object.values(EVENT_CATEGORIES)
      .flat()
      .map((e) => e.value);
    setNewWebhook((prev) => ({ ...prev, events: allEvents }));
  };

  const clearAllEvents = () => {
    setNewWebhook((prev) => ({ ...prev, events: [] }));
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
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Send real-time notifications to external services when events occur
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive event notifications
              </DialogDescription>
            </DialogHeader>

            {createdSecret ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                  <div className="mb-2 flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Webhook Created!</span>
                  </div>
                  <p className="mb-3 text-sm text-green-600 dark:text-green-400">
                    Save this secret - it will not be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white p-2 font-mono text-sm break-all dark:bg-gray-900">
                      {createdSecret}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(createdSecret, 'created')}
                    >
                      {copiedSecret === 'created' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setCreatedSecret(null);
                      setNewWebhook({ name: '', url: '', events: [] });
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="My Webhook"
                    value={newWebhook.name}
                    onChange={(e) =>
                      setNewWebhook((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com/webhook"
                    value={newWebhook.url}
                    onChange={(e) =>
                      setNewWebhook((prev) => ({
                        ...prev,
                        url: e.target.value,
                      }))
                    }
                  />
                  <p className="text-muted-foreground text-sm">
                    We will send a test request to verify the endpoint
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Events to subscribe</Label>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllEvents}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAllEvents}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-[300px] space-y-4 overflow-y-auto rounded-lg border p-4">
                    {Object.entries(EVENT_CATEGORIES).map(
                      ([category, events]) => (
                        <div key={category}>
                          <h4 className="mb-2 text-sm font-medium">
                            {category}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {events.map((event) => (
                              <div
                                key={event.value}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={event.value}
                                  checked={newWebhook.events.includes(
                                    event.value
                                  )}
                                  onCheckedChange={() =>
                                    toggleEvent(event.value)
                                  }
                                />
                                <label
                                  htmlFor={event.value}
                                  className="cursor-pointer text-sm"
                                >
                                  {event.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {newWebhook.events.length} events selected
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWebhook} disabled={creating}>
                    {creating && (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Webhook
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Webhook className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">No webhooks yet</h3>
                <p className="text-muted-foreground mb-4 text-center">
                  Create your first webhook to start receiving event
                  notifications
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            webhooks.map((webhook) => (
              <Card
                key={webhook.id}
                className={`cursor-pointer transition-colors ${
                  selectedWebhook?.id === webhook.id
                    ? 'border-primary'
                    : 'hover:border-muted-foreground/30'
                }`}
                onClick={() => fetchWebhookDetails(webhook.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          webhook.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <CardTitle className="text-base">
                        {webhook.name || 'Unnamed Webhook'}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={() => handleToggleWebhook(webhook)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestWebhook(webhook.id);
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWebhook(webhook.id);
                        }}
                      >
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <ExternalLink className="h-4 w-4" />
                      <span className="truncate">{webhook.url}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 3).map((event) => (
                        <Badge
                          key={event}
                          variant="secondary"
                          className="text-xs"
                        >
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      <span>{webhook.stats.total_deliveries} deliveries</span>
                      {webhook.stats.failed_deliveries > 0 && (
                        <span className="text-destructive">
                          {webhook.stats.failed_deliveries} failed
                        </span>
                      )}
                      {webhook.stats.last_delivery && (
                        <span>
                          Last:{' '}
                          {new Date(
                            webhook.stats.last_delivery
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          {selectedWebhook ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Webhook Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Secret
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="bg-muted rounded px-2 py-1 text-xs">
                      {selectedWebhook.secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRotateSecret(selectedWebhook.id)}
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">
                    Events
                  </Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedWebhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block text-xs">
                    Recent Deliveries
                  </Label>
                  {deliveries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No deliveries yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {deliveries.slice(0, 5).map((delivery) => (
                        <div
                          key={delivery.id}
                          className="bg-muted flex items-center justify-between rounded p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {delivery.status === 'success' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : delivery.status === 'failed' ? (
                              <XCircle className="h-3 w-3 text-red-500" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                            )}
                            <span>{delivery.event_type}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(delivery.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Webhook className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  Select a webhook to view details
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Webhooks send HTTP POST requests to your endpoint when events
                occur.
              </p>
              <div>
                <h4 className="mb-1 font-medium">Headers</h4>
                <code className="bg-muted block rounded p-2 text-xs">
                  X-Webhook-Signature: t=timestamp,v1=signature
                </code>
              </div>
              <div>
                <h4 className="mb-1 font-medium">Payload Format</h4>
                <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                  {`{
  "id": "evt_...",
  "event": "contact.created",
  "created_at": "2024-...",
  "data": { ... }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
