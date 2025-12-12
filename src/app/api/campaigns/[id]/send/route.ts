import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { addBulkEmailsToQueue } from '@/queues/email.queue';
import { prepareEmailContent } from '@/lib/resend';

// Status enums (replaces Prisma imports)
const CampaignStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
} as const;

const EmailSendStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  BOUNCED: 'BOUNCED',
  COMPLAINED: 'COMPLAINED',
} as const;

const ContactStatus = {
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
  BOUNCED: 'BOUNCED',
  COMPLAINED: 'COMPLAINED',
} as const;

// POST /api/campaigns/[id]/send - Send a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Get campaign with template
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*, email_templates(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validate campaign state
    if (campaign.status === CampaignStatus.SENDING) {
      return NextResponse.json(
        { error: 'Campaign is already sending' },
        { status: 400 }
      );
    }

    if (campaign.status === CampaignStatus.SENT) {
      return NextResponse.json(
        { error: 'Campaign has already been sent' },
        { status: 400 }
      );
    }

    const template = campaign.email_templates;
    if (!template && !campaign.html_content) {
      return NextResponse.json(
        { error: 'Campaign has no email content' },
        { status: 400 }
      );
    }

    if (!campaign.list_ids || campaign.list_ids.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no target lists' },
        { status: 400 }
      );
    }

    // Get contacts from all lists associated with this campaign
    const { data: listContacts } = await supabaseAdmin
      .from('list_contacts')
      .select('contact_id, contacts(*)')
      .in('list_id', campaign.list_ids);

    // Deduplicate contacts and filter for subscribed only
    const contactMap = new Map<string, any>();
    for (const lc of listContacts || []) {
      const contact = lc.contacts;
      if (contact && contact.status === ContactStatus.SUBSCRIBED) {
        contactMap.set(contact.id, contact);
      }
    }
    const eligibleContacts = Array.from(contactMap.values());

    if (eligibleContacts.length === 0) {
      return NextResponse.json(
        { error: 'No eligible contacts to send to' },
        { status: 400 }
      );
    }

    // Update campaign status to SENDING
    await supabaseAdmin
      .from('campaigns')
      .update({
        status: CampaignStatus.SENDING,
        started_at: new Date().toISOString(),
        total_recipients: eligibleContacts.length,
      })
      .eq('id', id);

    // Prepare email sends - create records in database
    const emailSendRecords = eligibleContacts.map((contact) => {
      const emailSendId = `es_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
      return {
        id: emailSendId,
        campaign_id: campaign.id,
        user_id: user.id,
        contact_id: contact.id,
        status: EmailSendStatus.PENDING,
        created_at: new Date().toISOString(),
      };
    });

    const { error: insertError } = await supabaseAdmin
      .from('email_sends')
      .insert(emailSendRecords);

    if (insertError) {
      console.error('Error creating email send records:', insertError);
      // Reset campaign status
      await supabaseAdmin
        .from('campaigns')
        .update({ status: CampaignStatus.DRAFT })
        .eq('id', id);
      return NextResponse.json(
        { error: 'Failed to prepare email sends' },
        { status: 500 }
      );
    }

    // Get user's Resend API key
    const { data: userWithApiKey } = await supabaseAdmin
      .from('users')
      .select('resend_api_key')
      .eq('id', user.id)
      .single();

    if (!userWithApiKey?.resend_api_key) {
      // Reset campaign status
      await supabaseAdmin
        .from('campaigns')
        .update({ status: CampaignStatus.DRAFT })
        .eq('id', id);
      return NextResponse.json(
        {
          error:
            'Resend API key not configured. Please configure it in settings.',
        },
        { status: 400 }
      );
    }

    // Use template content if available, otherwise use campaign's direct content
    const htmlContent = template?.html_content || campaign.html_content;
    const textContent = template?.text_content || campaign.text_content;

    // Prepare email jobs for the queue
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${baseUrl}/unsubscribe`;

    // Default from address
    const fromAddress = campaign.from_email
      ? `${campaign.from_name || ''} <${campaign.from_email}>`.trim()
      : `${campaign.from_name || 'Email Platform'} <noreply@${process.env.RESEND_FROM_DOMAIN || 'resend.dev'}>`;

    const emailJobs = eligibleContacts.map((contact) => {
      const { html, text } = prepareEmailContent(
        htmlContent,
        textContent,
        {
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name,
          metadata: contact.metadata as Record<string, unknown>,
        },
        {
          subject: campaign.subject,
          previewText: template?.preview_text || '',
          unsubscribeUrl: `${unsubscribeUrl}?email=${encodeURIComponent(contact.email)}&campaign=${campaign.id}`,
        }
      );

      return {
        campaignId: campaign.id,
        contactId: contact.id,
        userId: user.id,
        to: contact.email,
        from: fromAddress,
        subject: campaign.subject,
        html,
        text,
        replyTo: campaign.reply_to || undefined,
        resendApiKey: userWithApiKey.resend_api_key,
      };
    });

    // Add emails to the queue
    await addBulkEmailsToQueue(emailJobs);

    return NextResponse.json({
      success: true,
      message: `Campaign sending started to ${eligibleContacts.length} contacts`,
      totalRecipients: eligibleContacts.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error sending campaign:', error);

    // Reset campaign status on error
    try {
      const { id } = await params;
      await supabaseAdmin
        .from('campaigns')
        .update({ status: CampaignStatus.DRAFT })
        .eq('id', id);
    } catch (resetError) {
      console.error('Error resetting campaign status:', resetError);
    }

    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
