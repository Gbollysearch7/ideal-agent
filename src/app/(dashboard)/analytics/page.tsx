'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  MousePointerClick,
  Eye,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ListChecks,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AnalyticsData {
  overview: {
    totalContacts: number;
    subscribedContacts: number;
    totalLists: number;
    totalCampaigns: number;
    sentCampaigns: number;
    totalEmailsSent: number;
  };
  engagement: {
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    complaintRate: number;
  };
  charts: {
    dailyStats: { date: string; sent: number; opened: number; clicked: number }[];
    contactGrowth: { date: string; count: number }[];
  };
  recentCampaigns: {
    id: string;
    name: string;
    subject: string;
    completedAt: string;
    metrics: {
      sent: number;
      opened: number;
      clicked: number;
      openRate: number;
      clickRate: number;
    };
  }[];
  topLists: {
    id: string;
    name: string;
    contactCount: number;
  }[];
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div
            className={`text-xs flex items-center gap-1 mt-1 ${
              trend.positive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <TrendingUp
              className={`h-3 w-3 ${!trend.positive && 'rotate-180'}`}
            />
            {trend.value}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/analytics?days=${days}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (error) {
        toast.error('Failed to load analytics');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [days]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-[150px]" />
            <Skeleton className="h-4 w-[250px] mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[80px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Track your email marketing performance
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={data.overview.totalContacts.toLocaleString()}
          description={`${data.overview.subscribedContacts.toLocaleString()} subscribed`}
          icon={Users}
        />
        <StatCard
          title="Emails Sent"
          value={data.overview.totalEmailsSent.toLocaleString()}
          description={`${data.overview.sentCampaigns} campaigns`}
          icon={Mail}
        />
        <StatCard
          title="Open Rate"
          value={`${data.engagement.openRate}%`}
          description={`${data.engagement.opened.toLocaleString()} opens`}
          icon={Eye}
        />
        <StatCard
          title="Click Rate"
          value={`${data.engagement.clickRate}%`}
          description={`${data.engagement.clicked.toLocaleString()} clicks`}
          icon={MousePointerClick}
        />
      </div>

      {/* Engagement Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Delivered"
          value={data.engagement.delivered.toLocaleString()}
          icon={Mail}
        />
        <StatCard
          title="Bounced"
          value={data.engagement.bounced.toLocaleString()}
          description={`${data.engagement.bounceRate}% bounce rate`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Lists"
          value={data.overview.totalLists}
          icon={ListChecks}
        />
        <StatCard
          title="Campaigns"
          value={data.overview.totalCampaigns}
          icon={BarChart3}
        />
      </div>

      {/* Recent Campaigns & Top Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>
              Performance of your latest email campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No campaigns sent yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Open Rate</TableHead>
                    <TableHead className="text-right">Click Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-[150px]">
                            {campaign.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(campaign.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.metrics.sent}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            campaign.metrics.openRate > 20
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {campaign.metrics.openRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            campaign.metrics.clickRate > 5
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {campaign.metrics.clickRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Lists */}
        <Card>
          <CardHeader>
            <CardTitle>Top Lists</CardTitle>
            <CardDescription>Your largest contact lists</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topLists.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No lists created yet
              </p>
            ) : (
              <div className="space-y-4">
                {data.topLists.map((list, index) => (
                  <div key={list.id} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{list.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {list.contactCount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Activity Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Email Activity</CardTitle>
          <CardDescription>
            Daily email sends, opens, and clicks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.charts.dailyStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              No email activity data available for this period
            </p>
          ) : (
            <div className="h-[300px] flex items-end justify-between gap-1 pt-4">
              {data.charts.dailyStats.slice(-14).map((stat, index) => {
                const maxSent = Math.max(
                  ...data.charts.dailyStats.map((s) => s.sent)
                );
                const height = maxSent > 0 ? (stat.sent / maxSent) * 100 : 0;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary/20 rounded-t relative group cursor-pointer"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t"
                        style={{
                          height: `${
                            stat.sent > 0
                              ? (stat.opened / stat.sent) * 100
                              : 0
                          }%`,
                        }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {stat.sent} sent, {stat.opened} opened
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {stat.date.split(' ')[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
