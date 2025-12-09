import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CampaignStatus, EmailSendStatus } from '@prisma/client';

// GET /api/campaigns - List all campaigns with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Search
    const search = searchParams.get('search') || '';

    // Filter by status
    const status = searchParams.get('status') as CampaignStatus | null;

    // Build where clause
    const where: Record<string, unknown> = {
      userId: user.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Execute queries in parallel
    const [campaigns, total, statusCounts] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              emailSends: true,
            },
          },
        },
      }),
      prisma.campaign.count({ where }),
      prisma.campaign.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: true,
      }),
    ]);

    // Calculate metrics for each campaign
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        const delivered = await prisma.emailSend.count({
          where: {
            campaignId: campaign.id,
            status: { in: [EmailSendStatus.DELIVERED, EmailSendStatus.SENT] },
          },
        });

        const opened = await prisma.emailSend.count({
          where: {
            campaignId: campaign.id,
            openedAt: { not: null },
          },
        });

        const clicked = await prisma.emailSend.count({
          where: {
            campaignId: campaign.id,
            clickedAt: { not: null },
          },
        });

        // Get list names for display
        let lists: { id: string; name: string; contactCount: number }[] = [];
        if (campaign.listIds && campaign.listIds.length > 0) {
          lists = await prisma.list.findMany({
            where: { id: { in: campaign.listIds } },
            select: { id: true, name: true, contactCount: true },
          });
        }

        return {
          ...campaign,
          lists,
          metrics: {
            sent: campaign._count.emailSends,
            delivered,
            opened,
            clicked,
            openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
            clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
          },
        };
      })
    );

    return NextResponse.json({
      campaigns: campaignsWithMetrics,
      statusCounts: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create a new campaign
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  previewText: z.string().max(200).optional(),
  templateId: z.string().min(1, 'Template is required'),
  listIds: z.array(z.string()).min(1, 'At least one list is required'),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validation = createCampaignSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      subject,
      previewText,
      templateId,
      listIds,
      fromName,
      fromEmail,
      replyTo,
      scheduledAt,
    } = validation.data;

    // Verify template exists and belongs to user
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId: user.id,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify all lists exist and belong to user
    const lists = await prisma.list.findMany({
      where: {
        id: { in: listIds },
        userId: user.id,
      },
    });

    if (lists.length !== listIds.length) {
      return NextResponse.json({ error: 'One or more lists not found' }, { status: 404 });
    }

    // Calculate total recipients from all lists
    const totalRecipients = lists.reduce((sum, list) => sum + list.contactCount, 0);

    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        templateId,
        listIds,
        fromName: fromName || user.name,
        fromEmail: fromEmail || process.env.RESEND_FROM_EMAIL || '',
        replyTo,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
        userId: user.id,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        totalRecipients,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...campaign,
      lists: lists.map(l => ({ id: l.id, name: l.name, contactCount: l.contactCount })),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
