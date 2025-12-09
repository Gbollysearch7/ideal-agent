import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CampaignStatus, EmailSendStatus, ContactStatus } from '@prisma/client';
import { addBulkEmailsToQueue } from '@/queues/email.queue';
import { prepareEmailContent } from '@/lib/resend';

// POST /api/campaigns/[id]/send - Send a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Get campaign with template
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

    if (!campaign.template && !campaign.htmlContent) {
      return NextResponse.json(
        { error: 'Campaign has no email content' },
        { status: 400 }
      );
    }

    if (!campaign.listIds || campaign.listIds.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no target lists' },
        { status: 400 }
      );
    }

    // Get contacts from all lists associated with this campaign
    const listContacts = await prisma.listContact.findMany({
      where: {
        listId: { in: campaign.listIds },
      },
      include: {
        contact: true,
      },
    });

    // Deduplicate contacts and filter for subscribed only
    const contactMap = new Map<string, typeof listContacts[0]['contact']>();
    for (const lc of listContacts) {
      if (lc.contact.status === ContactStatus.SUBSCRIBED) {
        contactMap.set(lc.contact.id, lc.contact);
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
    await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.SENDING,
        startedAt: new Date(),
        totalRecipients: eligibleContacts.length,
      },
    });

    // Prepare email sends
    const emailSends = await prisma.emailSend.createManyAndReturn({
      data: eligibleContacts.map((contact) => ({
        campaignId: campaign.id,
        userId: user.id,
        contactId: contact.id,
        status: EmailSendStatus.PENDING,
      })),
    });

    // Get user's Resend API key
    const userWithApiKey = await prisma.user.findUnique({
      where: { id: user.id },
      select: { resendApiKey: true },
    });

    if (!userWithApiKey?.resendApiKey) {
      // Reset campaign status
      await prisma.campaign.update({
        where: { id },
        data: { status: CampaignStatus.DRAFT },
      });
      return NextResponse.json(
        { error: 'Resend API key not configured. Please configure it in settings.' },
        { status: 400 }
      );
    }

    // Use template content if available, otherwise use campaign's direct content
    const htmlContent = campaign.template?.htmlContent || campaign.htmlContent;
    const textContent = campaign.template?.textContent || campaign.textContent;

    // Prepare email jobs for the queue
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${baseUrl}/unsubscribe`;

    // Default from address
    const fromAddress = campaign.fromEmail
      ? `${campaign.fromName || ''} <${campaign.fromEmail}>`.trim()
      : `${campaign.fromName || 'Email Platform'} <noreply@${process.env.RESEND_FROM_DOMAIN || 'resend.dev'}>`;

    const emailJobs = eligibleContacts.map((contact, index) => {
      const { html, text } = prepareEmailContent(
        htmlContent,
        textContent,
        {
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          metadata: contact.metadata as Record<string, unknown>,
        },
        {
          subject: campaign.subject,
          previewText: campaign.template?.previewText || '',
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
        replyTo: campaign.replyTo || undefined,
        resendApiKey: userWithApiKey.resendApiKey!,
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
    const { id } = await params;
    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.DRAFT },
    });

    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
