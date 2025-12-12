import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '@/lib/supabase';

// Status and event type enums (replaces Prisma imports)
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

const EmailEventType = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  OPENED: 'OPENED',
  CLICKED: 'CLICKED',
  BOUNCED: 'BOUNCED',
  COMPLAINED: 'COMPLAINED',
} as const;

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

  const { data: emailSend } = await supabaseAdmin
    .from('email_sends')
    .select('id')
    .eq('resend_email_id', email_id)
    .single();

  if (emailSend) {
    await supabaseAdmin
      .from('email_sends')
      .update({
        status: EmailSendStatus.SENT,
        sent_at: new Date().toISOString(),
      })
      .eq('id', emailSend.id);

    // Create event record
    const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    await supabaseAdmin.from('email_events').insert({
      id: eventId,
      email_send_id: emailSend.id,
      event_type: EmailEventType.SENT,
      event_data: { timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
  }
}

async function handleEmailDelivered(event: ResendWebhookEvent) {
  const { email_id } = event.data;

  const { data: emailSend } = await supabaseAdmin
    .from('email_sends')
    .select('id')
    .eq('resend_email_id', email_id)
    .single();

  if (emailSend) {
    await supabaseAdmin
      .from('email_sends')
      .update({
        status: EmailSendStatus.DELIVERED,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', emailSend.id);

    // Create event record
    const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    await supabaseAdmin.from('email_events').insert({
      id: eventId,
      email_send_id: emailSend.id,
      event_type: EmailEventType.DELIVERED,
      event_data: { timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
  }
}

async function handleEmailOpened(event: ResendWebhookEvent) {
  const { email_id } = event.data;

  const { data: emailSend } = await supabaseAdmin
    .from('email_sends')
    .select('id, opened_at')
    .eq('resend_email_id', email_id)
    .single();

  if (emailSend) {
    // Only update openedAt if not already set (first open)
    if (!emailSend.opened_at) {
      await supabaseAdmin
        .from('email_sends')
        .update({
          opened_at: new Date().toISOString(),
        })
        .eq('id', emailSend.id);
    }

    // Create event record for each open
    const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    await supabaseAdmin.from('email_events').insert({
      id: eventId,
      email_send_id: emailSend.id,
      event_type: EmailEventType.OPENED,
      event_data: { timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
  }
}

async function handleEmailClicked(event: ResendWebhookEvent) {
  const { email_id, click } = event.data;

  const { data: emailSend } = await supabaseAdmin
    .from('email_sends')
    .select('id, clicked_at')
    .eq('resend_email_id', email_id)
    .single();

  if (emailSend) {
    // Only update clickedAt if not already set (first click)
    if (!emailSend.clicked_at) {
      await supabaseAdmin
        .from('email_sends')
        .update({
          clicked_at: new Date().toISOString(),
        })
        .eq('id', emailSend.id);
    }

    // Create event record for each click
    const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    await supabaseAdmin.from('email_events').insert({
      id: eventId,
      email_send_id: emailSend.id,
      event_type: EmailEventType.CLICKED,
      event_data: {
        timestamp: new Date().toISOString(),
        link: click?.link,
      },
      created_at: new Date().toISOString(),
    });
  }

  console.log('Email clicked:', email_id, 'Link:', click?.link);
}

async function handleEmailBounced(event: ResendWebhookEvent) {
  const { email_id, to, bounce } = event.data;

  const { data: emailSend } = await supabaseAdmin
    .from('email_sends')
    .select('id')
    .eq('resend_email_id', email_id)
    .single();

  if (emailSend) {
    await supabaseAdmin
      .from('email_sends')
      .update({
        status: EmailSendStatus.BOUNCED,
        bounced_at: new Date().toISOString(),
        bounce_reason: bounce?.message,
      })
      .eq('id', emailSend.id);

    // Create event record
    const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    await supabaseAdmin.from('email_events').insert({
      id: eventId,
      email_send_id: emailSend.id,
      event_type: EmailEventType.BOUNCED,
      event_data: {
        timestamp: new Date().toISOString(),
        reason: bounce?.message,
      },
      created_at: new Date().toISOString(),
    });
  }

  // Mark contact as bounced
  if (to && to.length > 0) {
    const lowerCaseEmails = to.map((e) => e.toLowerCase());
    await supabaseAdmin
      .from('contacts')
      .update({ status: ContactStatus.BOUNCED })
      .in('email', lowerCaseEmails);
  }

  console.log('Email bounced:', email_id, 'Reason:', bounce?.message);
}

async function handleEmailComplained(event: ResendWebhookEvent) {
  const { email_id, to, complaint } = event.data;

  const { data: emailSend } = await supabaseAdmin
    .from('email_sends')
    .select('id')
    .eq('resend_email_id', email_id)
    .single();

  if (emailSend) {
    await supabaseAdmin
      .from('email_sends')
      .update({
        status: EmailSendStatus.COMPLAINED,
      })
      .eq('id', emailSend.id);

    // Create event record
    const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    await supabaseAdmin.from('email_events').insert({
      id: eventId,
      email_send_id: emailSend.id,
      event_type: EmailEventType.COMPLAINED,
      event_data: {
        timestamp: new Date().toISOString(),
        reason: complaint?.message,
      },
      created_at: new Date().toISOString(),
    });
  }

  // Mark contact as complained
  if (to && to.length > 0) {
    const lowerCaseEmails = to.map((e) => e.toLowerCase());
    await supabaseAdmin
      .from('contacts')
      .update({ status: ContactStatus.COMPLAINED })
      .in('email', lowerCaseEmails);
  }

  console.log('Email complained:', email_id, 'Reason:', complaint?.message);
}
