'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Edit, Copy, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string | null;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setTemplate(data);
        }
      } catch (error) {
        console.error('Failed to fetch template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchTemplate();
    }
  }, [params.id]);

  const handleDuplicate = async () => {
    if (!template) return;
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('Template duplicated successfully');
        router.push('/dashboard/templates');
      }
    } catch {
      toast.error('Failed to duplicate template');
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Template deleted successfully');
        router.push('/dashboard/templates');
      }
    } catch {
      toast.error('Failed to delete template');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="bg-muted h-64 animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-medium tracking-tight">
            Template Not Found
          </h1>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <FileText className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-1 text-lg font-medium tracking-tight">
              Template not found
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              The template you&apos;re looking for doesn&apos;t exist or has
              been deleted.
            </p>
            <Button asChild>
              <Link href="/dashboard/templates">View All Templates</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-medium tracking-tight">
                {template.name}
              </h1>
              {template.category && (
                <Badge variant="secondary">{template.category}</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{template.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/templates/${template.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <Mail className="h-5 w-5" />
              Template Preview
            </CardTitle>
            <CardDescription>Preview of your email template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px] rounded-lg border bg-white p-6 text-black">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: template.content }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <FileText className="h-5 w-5" />
              Template Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border/50 flex justify-between border-b py-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{template.name}</span>
            </div>
            <div className="border-border/50 flex justify-between border-b py-2">
              <span className="text-muted-foreground">Subject</span>
              <span className="max-w-[200px] truncate font-medium">
                {template.subject}
              </span>
            </div>
            <div className="border-border/50 flex justify-between border-b py-2">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{template.category || '-'}</span>
            </div>
            <div className="border-border/50 flex justify-between border-b py-2">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">
                {new Date(template.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">
                {new Date(template.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Use Template */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Use this template to create a new email campaign
          </p>
          <Button asChild>
            <Link href={`/dashboard/campaigns/new?template=${template.id}`}>
              <Mail className="mr-2 h-4 w-4" />
              Create Campaign with Template
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
