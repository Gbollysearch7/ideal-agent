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
import {
  ArrowLeft,
  Mail,
  Users,
  Eye,
  MousePointerClick,
  Clock,
  Send,
  Edit,
  MoreHorizontal,
  Calendar,
  BarChart3,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  total_recipients: number;
  opens: number;
  clicks: number;
  bounces: number;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/campaigns/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setCampaign(data);
        }
      } catch (error) {
        console.error('Failed to fetch campaign:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-success/10 text-success';
      case 'DRAFT':
        return 'bg-muted text-muted-foreground';
      case 'SENDING':
        return 'bg-primary/10 text-primary';
      case 'SCHEDULED':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
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
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="bg-muted h-16 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-medium tracking-tight">
            Campaign Not Found
          </h1>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Mail className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-1 text-lg font-medium tracking-tight">
              Campaign not found
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              The campaign you&apos;re looking for doesn&apos;t exist or has
              been deleted.
            </p>
            <Button asChild>
              <Link href="/dashboard/campaigns">View All Campaigns</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openRate =
    campaign.total_recipients > 0
      ? ((campaign.opens / campaign.total_recipients) * 100).toFixed(1)
      : 0;
  const clickRate =
    campaign.total_recipients > 0
      ? ((campaign.clicks / campaign.total_recipients) * 100).toFixed(1)
      : 0;

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
                {campaign.name}
              </h1>
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button>
                <Send className="mr-2 h-4 w-4" />
                Send Now
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Users className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {campaign.total_recipients.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-sm">Recipients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Eye className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {openRate}%
                </p>
                <p className="text-muted-foreground text-sm">Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <MousePointerClick className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {clickRate}%
                </p>
                <p className="text-muted-foreground text-sm">Click Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Calendar className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {campaign.sent_at
                    ? new Date(campaign.sent_at).toLocaleDateString()
                    : '-'}
                </p>
                <p className="text-muted-foreground text-sm">Sent Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <Mail className="h-5 w-5" />
              Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="border-border/50 flex justify-between border-b py-2">
                <span className="text-muted-foreground">Campaign Name</span>
                <span className="font-medium">{campaign.name}</span>
              </div>
              <div className="border-border/50 flex justify-between border-b py-2">
                <span className="text-muted-foreground">Subject Line</span>
                <span className="font-medium">{campaign.subject}</span>
              </div>
              <div className="border-border/50 flex justify-between border-b py-2">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
              <div className="border-border/50 flex justify-between border-b py-2">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Bounces</span>
                <span className="font-medium">{campaign.bounces}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <BarChart3 className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>Email engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Opens</span>
                  <span>
                    {campaign.opens} ({openRate}%)
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-success h-full rounded-full transition-all"
                    style={{ width: `${openRate}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Clicks</span>
                  <span>
                    {campaign.clicks} ({clickRate}%)
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${clickRate}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Bounces</span>
                  <span>
                    {campaign.bounces} (
                    {campaign.total_recipients > 0
                      ? (
                          (campaign.bounces / campaign.total_recipients) *
                          100
                        ).toFixed(1)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-destructive h-full rounded-full transition-all"
                    style={{
                      width: `${
                        campaign.total_recipients > 0
                          ? (campaign.bounces / campaign.total_recipients) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {campaign.status === 'DRAFT' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground mb-4">
              This campaign is ready to be sent. Review the details and send
              when ready.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button>
                <Send className="mr-2 h-4 w-4" />
                Send Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
