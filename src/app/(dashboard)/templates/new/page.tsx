'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Eye, Code, Loader2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  category: z.string().max(50).optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
    }
    .content {
      padding: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      font-size: 12px;
      color: #666;
    }
    a {
      color: #007bff;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Hello {{firstName}}!</h1>
  </div>
  <div class="content">
    <p>Your email content goes here.</p>
    <p>You can use variables like {{firstName}}, {{lastName}}, and {{email}} to personalize your emails.</p>
  </div>
  <div class="footer">
    <p>You're receiving this email because you subscribed to our list.</p>
    <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
  </div>
</body>
</html>`;

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      subject: '',
      htmlContent: DEFAULT_TEMPLATE,
      textContent: '',
      category: '',
    },
  });

  const htmlContent = form.watch('htmlContent');

  // Extract variables from HTML content
  const extractVariables = (html: string): string[] => {
    const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const matches = new Set<string>();
    let match;

    while ((match = regex.exec(html)) !== null) {
      matches.add(match[1]);
    }

    return Array.from(matches);
  };

  const variables = extractVariables(htmlContent);

  const onSubmit = async (values: TemplateFormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create template');
      }

      const template = await response.json();
      toast.success('Template created successfully');
      router.push(`/templates/${template.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create template'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-medium tracking-tight">
            Create Template
          </h1>
          <p className="text-muted-foreground text-sm">
            Design your email template with HTML
          </p>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Template
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Settings */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Template Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Welcome Email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Line</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Welcome to {{companyName}}!"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Use &#123;&#123;variable&#125;&#125; for
                          personalization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Newsletter" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Variables */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detected Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  {variables.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {variables.map((v) => (
                        <Badge key={v} variant="secondary">
                          &#123;&#123;{v}&#125;&#125;
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No variables detected. Use
                      &#123;&#123;variableName&#125;&#125; syntax.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Editor */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <Tabs
                    value={previewTab}
                    onValueChange={(v) =>
                      setPreviewTab(v as 'editor' | 'preview')
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="editor">
                        <Code className="mr-2 h-4 w-4" />
                        HTML Editor
                      </TabsTrigger>
                      <TabsTrigger value="preview">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  <Tabs value={previewTab}>
                    <TabsContent value="editor" className="mt-0">
                      <FormField
                        control={form.control}
                        name="htmlContent"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                className="min-h-[500px] resize-none font-mono text-sm"
                                placeholder="Enter your HTML content here..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="preview" className="mt-0">
                      <div className="min-h-[500px] rounded-lg border bg-white">
                        <iframe
                          srcDoc={htmlContent}
                          className="h-[500px] w-full rounded-lg"
                          title="Email Preview"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Plain Text Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plain Text Version</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="textContent"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="min-h-[150px]"
                        placeholder="Enter a plain text version for email clients that don't support HTML (optional - will be auto-generated if not provided)"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This version is shown to recipients who can&apos;t view
                      HTML emails
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
