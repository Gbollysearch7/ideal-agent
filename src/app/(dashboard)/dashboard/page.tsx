import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Users,
  Mail,
  MousePointerClick,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';

async function getDashboardStats(userId: string) {
  // Get total subscribed contacts
  const { count: totalContacts } = await supabaseAdmin
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'SUBSCRIBED');

  // Get total campaigns
  const { count: totalCampaigns } = await supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get total emails sent
  const { count: totalEmailsSent } = await supabaseAdmin
    .from('email_sends')
    .select('*, campaigns!inner(user_id)', { count: 'exact', head: true })
    .eq('campaigns.user_id', userId)
    .eq('status', 'SENT');

  // Get recent campaigns
  const { data: recentCampaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, created_at, total_recipients')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Calculate open rate (mock data for now)
  const openRate = (totalEmailsSent || 0) > 0 ? 24.5 : 0;

  return {
    totalContacts: totalContacts || 0,
    totalCampaigns: totalCampaigns || 0,
    totalEmailsSent: totalEmailsSent || 0,
    openRate,
    recentCampaigns: (recentCampaigns || []).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.created_at,
      totalRecipients: c.total_recipients,
    })),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const stats = await getDashboardStats(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your email marketing.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Contacts
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalContacts.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">Active subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Campaigns
            </CardTitle>
            <Mail className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-muted-foreground text-xs">All time campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalEmailsSent.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              Total emails delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <MousePointerClick className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate}%</div>
            <p className="text-muted-foreground text-xs">Average open rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Campaigns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>Your latest email campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns.length > 0 ? (
              <div className="space-y-4">
                {stats.recentCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {campaign.totalRecipients} recipients
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          campaign.status === 'SENT'
                            ? 'bg-green-100 text-green-700'
                            : campaign.status === 'DRAFT'
                              ? 'bg-gray-100 text-gray-700'
                              : campaign.status === 'SENDING'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {campaign.status}
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground">
                  No campaigns yet. Create your first campaign!
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/contacts/import">
                <Users className="mr-2 h-4 w-4" />
                Import Contacts
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/templates/new">
                <Mail className="mr-2 h-4 w-4" />
                Create Template
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/lists">
                <Users className="mr-2 h-4 w-4" />
                Manage Lists
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/settings">
                <TrendingUp className="mr-2 h-4 w-4" />
                Configure Resend
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
