'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Users,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long'),
  previewText: z.string().max(200).optional(),
  templateId: z.string().min(1, 'Template is required'),
  listIds: z.array(z.string()).min(1, 'At least one list is required'),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional().or(z.literal('')),
  replyTo: z.string().email().optional().or(z.literal('')),
  scheduledAt: z.string().optional(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface Template {
  id: string;
  name: string;
  subject: string;
}

interface List {
  id: string;
  name: string;
  contactCount: number;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      subject: '',
      previewText: '',
      templateId: '',
      listIds: [],
      fromName: '',
      fromEmail: '',
      replyTo: '',
      scheduledAt: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, listsRes] = await Promise.all([
          fetch('/api/templates?limit=100'),
          fetch('/api/lists?limit=100'),
        ]);

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data.templates || []);
        }

        if (listsRes.ok) {
          const data = await listsRes.json();
          setLists(data.lists || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load templates and lists');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Update subject when template changes
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template && !form.getValues('subject')) {
      form.setValue('subject', template.subject);
    }
  };

  const onSubmit = async (values: CampaignFormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          fromEmail: values.fromEmail || undefined,
          replyTo: values.replyTo || undefined,
          scheduledAt: values.scheduledAt || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const campaign = await response.json();
      toast.success('Campaign created successfully');
      router.push(`/campaigns`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create campaign'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedLists = form.watch('listIds');
  const totalRecipients = lists
    .filter((l) => selectedLists.includes(l.id))
    .reduce((sum, l) => sum + l.contactCount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-medium tracking-tight">
            Create Campaign
          </h1>
          <p className="text-muted-foreground text-sm">
            Set up a new email campaign
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={loading || loadingData}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Create Campaign
        </Button>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Campaign Details */}
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Summer Sale Newsletter"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Internal name for your reference
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Subject</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Don't miss our summer sale!"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="previewText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preview Text</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="This text appears after the subject in the inbox..."
                              className="resize-none"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Shows in inbox preview (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      Email Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Template</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleTemplateChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a template" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templates.length === 0 ? (
                                <SelectItem value="" disabled>
                                  No templates available
                                </SelectItem>
                              ) : (
                                templates.map((template) => (
                                  <SelectItem
                                    key={template.id}
                                    value={template.id}
                                  >
                                    {template.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {templates.length === 0 && (
                              <Link
                                href="/dashboard/templates/new"
                                className="text-primary hover:underline"
                              >
                                Create your first template
                              </Link>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5" />
                      Recipients
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="listIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Select Lists</FormLabel>
                          <div className="space-y-2">
                            {lists.length === 0 ? (
                              <p className="text-muted-foreground text-sm">
                                No lists available.{' '}
                                <Link
                                  href="/dashboard/lists"
                                  className="text-primary hover:underline"
                                >
                                  Create a list
                                </Link>
                              </p>
                            ) : (
                              lists.map((list) => (
                                <FormField
                                  key={list.id}
                                  control={form.control}
                                  name="listIds"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-y-0 space-x-3">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(
                                            list.id
                                          )}
                                          onCheckedChange={(checked) => {
                                            const current = field.value || [];
                                            if (checked) {
                                              field.onChange([
                                                ...current,
                                                list.id,
                                              ]);
                                            } else {
                                              field.onChange(
                                                current.filter(
                                                  (id) => id !== list.id
                                                )
                                              );
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <div className="flex flex-1 items-center justify-between">
                                        <span className="text-sm font-medium">
                                          {list.name}
                                        </span>
                                        <span className="text-muted-foreground text-sm">
                                          {list.contactCount} contacts
                                        </span>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                              ))
                            )}
                          </div>
                          {totalRecipients > 0 && (
                            <p className="mt-4 text-sm font-medium">
                              Total recipients: {totalRecipients}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sender Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="hello@yourcompany.com"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave empty for default
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="replyTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reply-To Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="support@yourcompany.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="scheduledAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule Send</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormDescription>
                            Leave empty to save as draft
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
