import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

// GET /api/analytics - Get analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Get date range (default: last 30 days)
    const days = parseInt(searchParams.get('days') || '30', 10);
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days));

    // Get overview stats - all in parallel
    const [
      totalContactsResult,
      subscribedContactsResult,
      totalListsResult,
      totalCampaignsResult,
      sentCampaignsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabaseAdmin
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'SUBSCRIBED'),
      supabaseAdmin
        .from('lists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabaseAdmin
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabaseAdmin
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'SENT'),
    ]);

    const totalContacts = totalContactsResult.count || 0;
    const subscribedContacts = subscribedContactsResult.count || 0;
    const totalLists = totalListsResult.count || 0;
    const totalCampaigns = totalCampaignsResult.count || 0;
    const sentCampaigns = sentCampaignsResult.count || 0;

    // Get all user's campaign IDs for email send queries
    const { data: userCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('user_id', user.id);

    const campaignIds = (userCampaigns || []).map((c) => c.id);

    let totalEmailsSent = 0;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let complained = 0;

    if (campaignIds.length > 0) {
      // Get email engagement metrics
      const [
        totalEmailsSentResult,
        deliveredResult,
        openedResult,
        clickedResult,
        bouncedResult,
        complainedResult,
      ] = await Promise.all([
        supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .not('sent_at', 'is', null),
        supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .in('status', ['DELIVERED', 'SENT']),
        supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .not('opened_at', 'is', null),
        supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .not('clicked_at', 'is', null),
        supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .eq('status', 'BOUNCED'),
        supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .eq('status', 'COMPLAINED'),
      ]);

      totalEmailsSent = totalEmailsSentResult.count || 0;
      delivered = deliveredResult.count || 0;
      opened = openedResult.count || 0;
      clicked = clickedResult.count || 0;
      bounced = bouncedResult.count || 0;
      complained = complainedResult.count || 0;
    }

    // Calculate rates
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate =
      totalEmailsSent > 0 ? (bounced / totalEmailsSent) * 100 : 0;
    const complaintRate =
      totalEmailsSent > 0 ? (complained / totalEmailsSent) * 100 : 0;

    // Get daily email stats for chart using RPC or direct query
    // Since Supabase doesn't support complex groupBy with raw SQL easily,
    // we'll fetch the data and group it in JavaScript
    let dailyStats: {
      date: string;
      sent: number;
      opened: number;
      clicked: number;
    }[] = [];

    if (campaignIds.length > 0) {
      const { data: emailSendsData } = await supabaseAdmin
        .from('email_sends')
        .select('sent_at, opened_at, clicked_at')
        .in('campaign_id', campaignIds)
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString());

      // Group by date
      const statsMap = new Map<
        string,
        { sent: number; opened: number; clicked: number }
      >();

      (emailSendsData || []).forEach((send) => {
        if (send.sent_at) {
          const dateKey = format(new Date(send.sent_at), 'yyyy-MM-dd');
          const existing = statsMap.get(dateKey) || {
            sent: 0,
            opened: 0,
            clicked: 0,
          };
          existing.sent += 1;
          if (send.opened_at) existing.opened += 1;
          if (send.clicked_at) existing.clicked += 1;
          statsMap.set(dateKey, existing);
        }
      });

      dailyStats = Array.from(statsMap.entries())
        .map(([date, stats]) => ({
          date: format(new Date(date), 'MMM dd'),
          ...stats,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Get recent campaigns with performance
    const { data: recentCampaignsData } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, subject, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'SENT')
      .order('completed_at', { ascending: false })
      .limit(5);

    // Get metrics for recent campaigns
    const campaignsWithMetrics = await Promise.all(
      (recentCampaignsData || []).map(async (campaign) => {
        const [sentResult, openedResult, clickedResult] = await Promise.all([
          supabaseAdmin
            .from('email_sends')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id),
          supabaseAdmin
            .from('email_sends')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .not('opened_at', 'is', null),
          supabaseAdmin
            .from('email_sends')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .not('clicked_at', 'is', null),
        ]);

        const sent = sentResult.count || 0;
        const openedCount = openedResult.count || 0;
        const clickedCount = clickedResult.count || 0;

        return {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          completedAt: campaign.completed_at,
          metrics: {
            sent,
            opened: openedCount,
            clicked: clickedCount,
            openRate: sent > 0 ? (openedCount / sent) * 100 : 0,
            clickRate: openedCount > 0 ? (clickedCount / openedCount) * 100 : 0,
          },
        };
      })
    );

    // Get contact growth data
    const { data: contactGrowthData } = await supabaseAdmin
      .from('contacts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Group contact growth by date
    const contactGrowthMap = new Map<string, number>();
    (contactGrowthData || []).forEach((contact) => {
      const dateKey = format(new Date(contact.created_at), 'yyyy-MM-dd');
      contactGrowthMap.set(dateKey, (contactGrowthMap.get(dateKey) || 0) + 1);
    });

    const contactGrowth = Array.from(contactGrowthMap.entries())
      .map(([date, count]) => ({
        date: format(new Date(date), 'MMM dd'),
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top performing lists
    const { data: topLists } = await supabaseAdmin
      .from('lists')
      .select('id, name, contact_count')
      .eq('user_id', user.id)
      .order('contact_count', { ascending: false })
      .limit(5);

    return NextResponse.json({
      overview: {
        totalContacts,
        subscribedContacts,
        totalLists,
        totalCampaigns,
        sentCampaigns,
        totalEmailsSent,
      },
      engagement: {
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        complaintRate: Math.round(complaintRate * 100) / 100,
      },
      charts: {
        dailyStats,
        contactGrowth,
      },
      recentCampaigns: campaignsWithMetrics,
      topLists: (topLists || []).map((list) => ({
        id: list.id,
        name: list.name,
        contactCount: list.contact_count,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
