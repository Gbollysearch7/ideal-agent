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
  Sparkles,
  FileText,
  Settings,
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-medium tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Welcome back. Here&apos;s your email marketing overview.
          </p>
        </div>
        <Button asChild size="lg" className="w-full md:w-auto">
          <Link href="/dashboard/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats Cards - Chronicle Style */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Contacts
            </CardTitle>
            <div className="bg-foreground/5 rounded-lg p-2">
              <Users className="text-foreground/70 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {stats.totalContacts.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Active subscribers
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Campaigns
            </CardTitle>
            <div className="bg-foreground/5 rounded-lg p-2">
              <Mail className="text-foreground/70 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {stats.totalCampaigns}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">All time</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Emails Sent
            </CardTitle>
            <div className="bg-foreground/5 rounded-lg p-2">
              <TrendingUp className="text-foreground/70 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {stats.totalEmailsSent.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Total delivered
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Open Rate
            </CardTitle>
            <div className="bg-foreground/5 rounded-lg p-2">
              <MousePointerClick className="text-foreground/70 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {stats.openRate}%
            </div>
            <p className="text-muted-foreground mt-1 text-sm">Average rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Campaigns */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-medium tracking-tight">
                  Recent Campaigns
                </CardTitle>
                <CardDescription className="mt-1">
                  Your latest email campaigns
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/campaigns">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns.length > 0 ? (
              <div className="space-y-3">
                {stats.recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="border-border/50 hover:bg-accent hover:border-border flex items-center justify-between rounded-lg border p-4 transition-all duration-200"
                  >
                    <div className="space-y-1">
                      <p className="font-medium tracking-tight">
                        {campaign.name}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {campaign.totalRecipients} recipients
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          campaign.status === 'SENT'
                            ? 'bg-success/10 text-success'
                            : campaign.status === 'DRAFT'
                              ? 'bg-muted text-muted-foreground'
                              : campaign.status === 'SENDING'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {campaign.status}
                      </span>
                      <ArrowRight className="text-muted-foreground h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted mb-4 rounded-full p-4">
                  <Mail className="text-muted-foreground h-8 w-8" />
                </div>
                <p className="text-muted-foreground mb-4">
                  No campaigns yet. Create your first campaign!
                </p>
                <Button asChild>
                  <Link href="/dashboard/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-medium tracking-tight">
              Quick Actions
            </CardTitle>
            <CardDescription className="mt-1">
              Get started with common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="h-12 w-full justify-start px-4"
              asChild
            >
              <Link href="/dashboard/contacts/import">
                <div className="bg-foreground/5 mr-3 rounded-lg p-1.5">
                  <Users className="h-4 w-4" />
                </div>
                Import Contacts
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full justify-start px-4"
              asChild
            >
              <Link href="/dashboard/templates/new">
                <div className="bg-foreground/5 mr-3 rounded-lg p-1.5">
                  <FileText className="h-4 w-4" />
                </div>
                Create Template
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full justify-start px-4"
              asChild
            >
              <Link href="/dashboard/ai-assistant">
                <div className="bg-foreground/5 mr-3 rounded-lg p-1.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                AI Assistant
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full justify-start px-4"
              asChild
            >
              <Link href="/dashboard/settings">
                <div className="bg-foreground/5 mr-3 rounded-lg p-1.5">
                  <Settings className="h-4 w-4" />
                </div>
                Configure Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
