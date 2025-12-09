import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';
import { EmailSendStatus, ContactStatus, EmailEventType } from '@prisma/client';

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at?: string;
    click?: {
      link: string;
      timestamp: string;
    };
    bounce?: {
      message: string;
    };
    complaint?: {
      message: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const headers = {
      'svix-id': request.headers.get('svix-id') || '',
      'svix-timestamp': request.headers.get('svix-timestamp') || '',
      'svix-signature': request.headers.get('svix-signature') || '',
    };

    // Verify webhook signature
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const wh = new Webhook(webhookSecret);
    let event: ResendWebhookEvent;

    try {
      event = wh.verify(payload, headers) as ResendWebhookEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    console.log('Received Resend webhook:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'email.sent':
        await handleEmailSent(event);
        break;

      case 'email.delivered':
        await handleEmailDelivered(event);
        break;

      case 'email.opened':
        await handleEmailOpened(event);
        break;

      case 'email.clicked':
        await handleEmailClicked(event);
        break;

      case 'email.bounced':
        await handleEmailBounced(event);
        break;

      case 'email.complained':
        await handleEmailComplained(event);
        break;

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleEmailSent(event: ResendWebhookEvent) {
  const { email_id } = event.data;

  const emailSend = await prisma.emailSend.findFirst({
    where: { resendEmailId: email_id },
  });

  if (emailSend) {
    await prisma.emailSend.update({
      where: { id: emailSend.id },
      data: {
        status: EmailSendStatus.SENT,
        sentAt: new Date(),
      },
    });

    // Create event record
    await prisma.emailEvent.create({
      data: {
        emailSendId: emailSend.id,
        eventType: EmailEventType.SENT,
        eventData: { timestamp: new Date().toISOString() },
      },
    });
  }
}

async function handleEmailDelivered(event: ResendWebhookEvent) {
  const { email_id } = event.data;

  const emailSend = await prisma.emailSend.findFirst({
    where: { resendEmailId: email_id },
  });

  if (emailSend) {
    await prisma.emailSend.update({
      where: { id: emailSend.id },
      data: {
        status: EmailSendStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });

    // Create event record
    await prisma.emailEvent.create({
      data: {
        emailSendId: emailSend.id,
        eventType: EmailEventType.DELIVERED,
        eventData: { timestamp: new Date().toISOString() },
      },
    });
  }
}

async function handleEmailOpened(event: ResendWebhookEvent) {
  const { email_id } = event.data;

  const emailSend = await prisma.emailSend.findFirst({
    where: { resendEmailId: email_id },
  });

  if (emailSend) {
    // Only update openedAt if not already set (first open)
    if (!emailSend.openedAt) {
      await prisma.emailSend.update({
        where: { id: emailSend.id },
        data: {
          openedAt: new Date(),
        },
      });
    }

    // Create event record for each open
    await prisma.emailEvent.create({
      data: {
        emailSendId: emailSend.id,
        eventType: EmailEventType.OPENED,
        eventData: { timestamp: new Date().toISOString() },
      },
    });
  }
}

async function handleEmailClicked(event: ResendWebhookEvent) {
  const { email_id, click } = event.data;

  const emailSend = await prisma.emailSend.findFirst({
    where: { resendEmailId: email_id },
  });

  if (emailSend) {
    // Only update clickedAt if not already set (first click)
    if (!emailSend.clickedAt) {
      await prisma.emailSend.update({
        where: { id: emailSend.id },
        data: {
          clickedAt: new Date(),
        },
      });
    }

    // Create event record for each click
    await prisma.emailEvent.create({
      data: {
        emailSendId: emailSend.id,
        eventType: EmailEventType.CLICKED,
        eventData: {
          timestamp: new Date().toISOString(),
          link: click?.link,
        },
      },
    });
  }

  console.log('Email clicked:', email_id, 'Link:', click?.link);
}

async function handleEmailBounced(event: ResendWebhookEvent) {
  const { email_id, to, bounce } = event.data;

  const emailSend = await prisma.emailSend.findFirst({
    where: { resendEmailId: email_id },
  });

  if (emailSend) {
    await prisma.emailSend.update({
      where: { id: emailSend.id },
      data: {
        status: EmailSendStatus.BOUNCED,
        bouncedAt: new Date(),
        bounceReason: bounce?.message,
      },
    });

    // Create event record
    await prisma.emailEvent.create({
      data: {
        emailSendId: emailSend.id,
        eventType: EmailEventType.BOUNCED,
        eventData: {
          timestamp: new Date().toISOString(),
          reason: bounce?.message,
        },
      },
    });
  }

  // Mark contact as bounced
  if (to && to.length > 0) {
    await prisma.contact.updateMany({
      where: {
        email: { in: to.map((e) => e.toLowerCase()) },
      },
      data: {
        status: ContactStatus.BOUNCED,
      },
    });
  }

  console.log('Email bounced:', email_id, 'Reason:', bounce?.message);
}

async function handleEmailComplained(event: ResendWebhookEvent) {
  const { email_id, to, complaint } = event.data;

  const emailSend = await prisma.emailSend.findFirst({
    where: { resendEmailId: email_id },
  });

  if (emailSend) {
    await prisma.emailSend.update({
      where: { id: emailSend.id },
      data: {
        status: EmailSendStatus.COMPLAINED,
      },
    });

    // Create event record
    await prisma.emailEvent.create({
      data: {
        emailSendId: emailSend.id,
        eventType: EmailEventType.COMPLAINED,
        eventData: {
          timestamp: new Date().toISOString(),
          reason: complaint?.message,
        },
      },
    });
  }

  // Mark contact as complained
  if (to && to.length > 0) {
    await prisma.contact.updateMany({
      where: {
        email: { in: to.map((e) => e.toLowerCase()) },
      },
      data: {
        status: ContactStatus.COMPLAINED,
      },
    });
  }

  console.log('Email complained:', email_id, 'Reason:', complaint?.message);
}
