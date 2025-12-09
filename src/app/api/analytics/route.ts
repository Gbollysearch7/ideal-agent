import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { ContactStatus, CampaignStatus, EmailSendStatus } from '@prisma/client';

// GET /api/analytics - Get analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Get date range (default: last 30 days)
    const days = parseInt(searchParams.get('days') || '30', 10);
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days));

    // Get overview stats
    const [
      totalContacts,
      subscribedContacts,
      totalLists,
      totalCampaigns,
      sentCampaigns,
      totalEmailsSent,
    ] = await Promise.all([
      prisma.contact.count({ where: { userId: user.id } }),
      prisma.contact.count({
        where: { userId: user.id, status: ContactStatus.SUBSCRIBED },
      }),
      prisma.list.count({ where: { userId: user.id } }),
      prisma.campaign.count({ where: { userId: user.id } }),
      prisma.campaign.count({
        where: { userId: user.id, status: CampaignStatus.SENT },
      }),
      prisma.emailSend.count({
        where: {
          campaign: { userId: user.id },
          sentAt: { not: null },
        },
      }),
    ]);

    // Get email engagement metrics
    const [delivered, opened, clicked, bounced, complained] = await Promise.all([
      prisma.emailSend.count({
        where: {
          campaign: { userId: user.id },
          status: { in: [EmailSendStatus.DELIVERED, EmailSendStatus.SENT] },
        },
      }),
      prisma.emailSend.count({
        where: {
          campaign: { userId: user.id },
          openedAt: { not: null },
        },
      }),
      prisma.emailSend.count({
        where: {
          campaign: { userId: user.id },
          clickedAt: { not: null },
        },
      }),
      prisma.emailSend.count({
        where: {
          campaign: { userId: user.id },
          status: EmailSendStatus.BOUNCED,
        },
      }),
      prisma.emailSend.count({
        where: {
          campaign: { userId: user.id },
          status: EmailSendStatus.COMPLAINED,
        },
      }),
    ]);

    // Calculate rates
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate = totalEmailsSent > 0 ? (bounced / totalEmailsSent) * 100 : 0;
    const complaintRate = totalEmailsSent > 0 ? (complained / totalEmailsSent) * 100 : 0;

    // Get daily email stats for chart
    const dailyStats = await prisma.$queryRaw<
      { date: Date; sent: bigint; opened: bigint; clicked: bigint }[]
    >`
      SELECT
        DATE("sentAt") as date,
        COUNT(*) as sent,
        COUNT(CASE WHEN "openedAt" IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN "clickedAt" IS NOT NULL THEN 1 END) as clicked
      FROM "EmailSend" es
      JOIN "Campaign" c ON es."campaignId" = c.id
      WHERE c."userId" = ${user.id}
        AND es."sentAt" >= ${startDate}
        AND es."sentAt" <= ${endDate}
      GROUP BY DATE("sentAt")
      ORDER BY date ASC
    `;

    // Get recent campaigns with performance
    const recentCampaigns = await prisma.campaign.findMany({
      where: {
        userId: user.id,
        status: CampaignStatus.SENT,
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        subject: true,
        completedAt: true,
        _count: {
          select: {
            emailSends: true,
          },
        },
      },
    });

    // Get metrics for recent campaigns
    const campaignsWithMetrics = await Promise.all(
      recentCampaigns.map(async (campaign) => {
        const [sent, openedCount, clickedCount] = await Promise.all([
          prisma.emailSend.count({ where: { campaignId: campaign.id } }),
          prisma.emailSend.count({
            where: { campaignId: campaign.id, openedAt: { not: null } },
          }),
          prisma.emailSend.count({
            where: { campaignId: campaign.id, clickedAt: { not: null } },
          }),
        ]);

        return {
          ...campaign,
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
    const contactGrowth = await prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "Contact"
      WHERE "userId" = ${user.id}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Get top performing lists
    const topLists = await prisma.list.findMany({
      where: { userId: user.id },
      orderBy: { contactCount: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        contactCount: true,
      },
    });

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
        dailyStats: dailyStats.map((stat) => ({
          date: format(new Date(stat.date), 'MMM dd'),
          sent: Number(stat.sent),
          opened: Number(stat.opened),
          clicked: Number(stat.clicked),
        })),
        contactGrowth: contactGrowth.map((stat) => ({
          date: format(new Date(stat.date), 'MMM dd'),
          count: Number(stat.count),
        })),
      },
      recentCampaigns: campaignsWithMetrics,
      topLists,
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
