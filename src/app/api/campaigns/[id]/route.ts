import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CampaignStatus, EmailSendStatus } from '@prisma/client';

// GET /api/campaigns/[id] - Get a single campaign with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        template: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get detailed metrics
    const [totalSent, delivered, opened, clicked, bounced, complained] =
      await Promise.all([
        prisma.emailSend.count({ where: { campaignId: id } }),
        prisma.emailSend.count({
          where: { campaignId: id, status: { in: [EmailSendStatus.DELIVERED, EmailSendStatus.SENT] } },
        }),
        prisma.emailSend.count({
          where: { campaignId: id, openedAt: { not: null } },
        }),
        prisma.emailSend.count({
          where: { campaignId: id, clickedAt: { not: null } },
        }),
        prisma.emailSend.count({
          where: { campaignId: id, status: EmailSendStatus.BOUNCED },
        }),
        prisma.emailSend.count({
          where: { campaignId: id, status: EmailSendStatus.COMPLAINED },
        }),
      ]);

    return NextResponse.json({
      ...campaign,
      metrics: {
        sent: totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
        bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
        complaintRate: totalSent > 0 ? (complained / totalSent) * 100 : 0,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PATCH /api/campaigns/[id] - Update a campaign
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(200).optional(),
  previewText: z.string().max(200).optional().nullable(),
  templateId: z.string().optional().nullable(),
  listIds: z.array(z.string()).optional(),
  fromName: z.string().max(100).optional().nullable(),
  fromEmail: z.string().email().optional().nullable(),
  replyTo: z.string().email().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(CampaignStatus).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const validation = updateCampaignSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check if campaign exists and belongs to user
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow updates to sent or sending campaigns (except status)
    if (
      ['SENDING', 'SENT'].includes(existingCampaign.status) &&
      Object.keys(body).some((key) => key !== 'status')
    ) {
      return NextResponse.json(
        { error: 'Cannot update a campaign that has been sent or is sending' },
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
      status,
    } = validation.data;

    // If template is being changed, verify it exists
    if (templateId) {
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
    }

    // If lists are being changed, verify they exist
    if (listIds && listIds.length > 0) {
      const lists = await prisma.list.findMany({
        where: {
          id: { in: listIds },
          userId: user.id,
        },
      });

      if (lists.length !== listIds.length) {
        return NextResponse.json({ error: 'One or more lists not found' }, { status: 404 });
      }
    }

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (subject) updateData.subject = subject;
    if (previewText !== undefined) updateData.previewText = previewText;
    if (templateId !== undefined) updateData.templateId = templateId;
    if (listIds) updateData.listIds = listIds;
    if (fromName !== undefined) updateData.fromName = fromName;
    if (fromEmail !== undefined) updateData.fromEmail = fromEmail;
    if (replyTo !== undefined) updateData.replyTo = replyTo;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }
    if (status) updateData.status = status;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if campaign exists and belongs to user
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion of sending campaigns
    if (existingCampaign.status === CampaignStatus.SENDING) {
      return NextResponse.json(
        { error: 'Cannot delete a campaign that is currently sending' },
        { status: 400 }
      );
    }

    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
