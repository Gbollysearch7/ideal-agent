import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// Campaign status enum (replaces Prisma import)
const CampaignStatus = [
  'DRAFT',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'PAUSED',
  'CANCELLED',
] as const;
type CampaignStatusType = (typeof CampaignStatus)[number];

// GET /api/campaigns/[id] - Get a single campaign with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, email_templates(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get detailed metrics
    const [
      { count: totalSent },
      { count: delivered },
      { count: opened },
      { count: clicked },
      { count: bounced },
      { count: complained },
    ] = await Promise.all([
      supabaseAdmin
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id),
      supabaseAdmin
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .in('status', ['DELIVERED', 'SENT']),
      supabaseAdmin
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .not('opened_at', 'is', null),
      supabaseAdmin
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .not('clicked_at', 'is', null),
      supabaseAdmin
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('status', 'BOUNCED'),
      supabaseAdmin
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('status', 'COMPLAINED'),
    ]);

    const totalSentCount = totalSent || 0;
    const deliveredCount = delivered || 0;
    const openedCount = opened || 0;
    const clickedCount = clicked || 0;
    const bouncedCount = bounced || 0;
    const complainedCount = complained || 0;

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      previewText: campaign.preview_text,
      status: campaign.status,
      templateId: campaign.template_id,
      template: campaign.email_templates
        ? {
            id: campaign.email_templates.id,
            name: campaign.email_templates.name,
            subject: campaign.email_templates.subject,
            htmlContent: campaign.email_templates.html_content,
            textContent: campaign.email_templates.text_content,
          }
        : null,
      listIds: campaign.list_ids,
      fromName: campaign.from_name,
      fromEmail: campaign.from_email,
      replyTo: campaign.reply_to,
      htmlContent: campaign.html_content,
      textContent: campaign.text_content,
      scheduledAt: campaign.scheduled_at,
      sentAt: campaign.sent_at,
      totalRecipients: campaign.total_recipients,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      metrics: {
        sent: totalSentCount,
        delivered: deliveredCount,
        opened: openedCount,
        clicked: clickedCount,
        bounced: bouncedCount,
        complained: complainedCount,
        openRate: deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0,
        clickRate: openedCount > 0 ? (clickedCount / openedCount) * 100 : 0,
        bounceRate:
          totalSentCount > 0 ? (bouncedCount / totalSentCount) * 100 : 0,
        complaintRate:
          totalSentCount > 0 ? (complainedCount / totalSentCount) * 100 : 0,
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
  status: z.enum(CampaignStatus).optional(),
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
    const { data: existingCampaign, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingCampaign) {
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
      const { data: template, error: templateError } = await supabaseAdmin
        .from('email_templates')
        .select('id')
        .eq('id', templateId)
        .eq('user_id', user.id)
        .single();

      if (templateError || !template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
    }

    // If lists are being changed, verify they exist
    if (listIds && listIds.length > 0) {
      const { data: lists, error: listsError } = await supabaseAdmin
        .from('lists')
        .select('id')
        .in('id', listIds)
        .eq('user_id', user.id);

      if (listsError || !lists || lists.length !== listIds.length) {
        return NextResponse.json(
          { error: 'One or more lists not found' },
          { status: 404 }
        );
      }
    }

    // Build update data object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name) updateData.name = name;
    if (subject) updateData.subject = subject;
    if (previewText !== undefined) updateData.preview_text = previewText;
    if (templateId !== undefined) updateData.template_id = templateId;
    if (listIds) updateData.list_ids = listIds;
    if (fromName !== undefined) updateData.from_name = fromName;
    if (fromEmail !== undefined) updateData.from_email = fromEmail;
    if (replyTo !== undefined) updateData.reply_to = replyTo;
    if (scheduledAt !== undefined) {
      updateData.scheduled_at = scheduledAt || null;
    }
    if (status) updateData.status = status;

    const { data: campaign, error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select('*, email_templates(id, name)')
      .single();

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      previewText: campaign.preview_text,
      status: campaign.status,
      templateId: campaign.template_id,
      template: campaign.email_templates
        ? {
            id: campaign.email_templates.id,
            name: campaign.email_templates.name,
          }
        : null,
      listIds: campaign.list_ids,
      fromName: campaign.from_name,
      fromEmail: campaign.from_email,
      replyTo: campaign.reply_to,
      scheduledAt: campaign.scheduled_at,
      sentAt: campaign.sent_at,
      totalRecipients: campaign.total_recipients,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
    });
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
    const { data: existingCampaign, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion of sending campaigns
    if (existingCampaign.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Cannot delete a campaign that is currently sending' },
        { status: 400 }
      );
    }

    // Delete associated email sends first
    await supabaseAdmin.from('email_sends').delete().eq('campaign_id', id);

    // Delete the campaign
    const { error: deleteError } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      );
    }

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
