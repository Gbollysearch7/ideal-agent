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

// GET /api/campaigns - List all campaigns with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Search
    const search = searchParams.get('search') || '';

    // Filter by status
    const status = searchParams.get('status') as CampaignStatusType | null;

    // Build query
    let query = supabaseAdmin
      .from('campaigns')
      .select('*, email_templates(id, name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    if (status && CampaignStatus.includes(status)) {
      query = query.eq('status', status);
    }

    const { data: campaigns, count: total, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    // Get status counts
    const { data: statusCountsData } = await supabaseAdmin
      .from('campaigns')
      .select('status')
      .eq('user_id', user.id);

    const statusCounts: Record<string, number> = {};
    if (statusCountsData) {
      statusCountsData.forEach((item) => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });
    }

    // Calculate metrics for each campaign
    const campaignsWithMetrics = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Count email sends
        const { count: emailSendsCount } = await supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);

        // Count delivered
        const { count: delivered } = await supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .in('status', ['DELIVERED', 'SENT']);

        // Count opened
        const { count: opened } = await supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .not('opened_at', 'is', null);

        // Count clicked
        const { count: clicked } = await supabaseAdmin
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .not('clicked_at', 'is', null);

        // Get list names for display
        let lists: { id: string; name: string; contactCount: number }[] = [];
        if (campaign.list_ids && campaign.list_ids.length > 0) {
          const { data: listsData } = await supabaseAdmin
            .from('lists')
            .select('id, name, contact_count')
            .in('id', campaign.list_ids);

          lists = (listsData || []).map((l) => ({
            id: l.id,
            name: l.name,
            contactCount: l.contact_count,
          }));
        }

        const deliveredCount = delivered || 0;
        const openedCount = opened || 0;
        const clickedCount = clicked || 0;

        return {
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
          lists,
          fromName: campaign.from_name,
          fromEmail: campaign.from_email,
          replyTo: campaign.reply_to,
          scheduledAt: campaign.scheduled_at,
          sentAt: campaign.sent_at,
          totalRecipients: campaign.total_recipients,
          createdAt: campaign.created_at,
          updatedAt: campaign.updated_at,
          metrics: {
            sent: emailSendsCount || 0,
            delivered: deliveredCount,
            opened: openedCount,
            clicked: clickedCount,
            openRate:
              deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0,
            clickRate: openedCount > 0 ? (clickedCount / openedCount) * 100 : 0,
          },
        };
      })
    );

    return NextResponse.json({
      campaigns: campaignsWithMetrics,
      statusCounts,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
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
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long'),
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
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('id, html_content, text_content')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify all lists exist and belong to user
    const { data: lists, error: listsError } = await supabaseAdmin
      .from('lists')
      .select('id, name, contact_count')
      .in('id', listIds)
      .eq('user_id', user.id);

    if (listsError || !lists || lists.length !== listIds.length) {
      return NextResponse.json(
        { error: 'One or more lists not found' },
        { status: 404 }
      );
    }

    // Calculate total recipients from all lists
    const totalRecipients = lists.reduce(
      (sum, list) => sum + (list.contact_count || 0),
      0
    );

    // Generate campaign ID
    const campaignId = `camp_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    const { data: campaign, error: insertError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        id: campaignId,
        name,
        subject,
        preview_text: previewText || null,
        template_id: templateId,
        list_ids: listIds,
        from_name: fromName || user.name,
        from_email: fromEmail || process.env.RESEND_FROM_EMAIL || '',
        reply_to: replyTo || null,
        scheduled_at: scheduledAt || null,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        user_id: user.id,
        html_content: template.html_content,
        text_content: template.text_content,
        total_recipients: totalRecipients,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*, email_templates(id, name)')
      .single();

    if (insertError) {
      console.error('Error creating campaign:', insertError);
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
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
        lists: lists.map((l) => ({
          id: l.id,
          name: l.name,
          contactCount: l.contact_count,
        })),
        fromName: campaign.from_name,
        fromEmail: campaign.from_email,
        replyTo: campaign.reply_to,
        scheduledAt: campaign.scheduled_at,
        totalRecipients: campaign.total_recipients,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
      },
      { status: 201 }
    );
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
