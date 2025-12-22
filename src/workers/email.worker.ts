/**
 * Email Worker
 *
 * This worker processes email jobs from the BullMQ queue.
 * It should be run as a separate process from the Next.js application.
 *
 * Usage:
 *   npx tsx src/workers/email.worker.ts
 *
 * Or with PM2:
 *   pm2 start src/workers/email.worker.ts --interpreter tsx --name email-worker
 */

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { Resend } from 'resend';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

// Email job data interface
interface EmailJobData {
  campaignId?: string;
  contactId: string;
  userId: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  resendApiKey: string;
}

// Initialize Redis connection
const redisConnection = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
);

// Initialize Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Status enums
const EmailSendStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  BOUNCED: 'BOUNCED',
  COMPLAINED: 'COMPLAINED',
  FAILED: 'FAILED',
} as const;

const CampaignStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
} as const;

// Create Resend instances cache
const resendInstances = new Map<string, Resend>();

function getResendClient(apiKey: string): Resend {
  if (!resendInstances.has(apiKey)) {
    resendInstances.set(apiKey, new Resend(apiKey));
  }
  return resendInstances.get(apiKey)!;
}

// Process email job
async function processEmailJob(job: Job<EmailJobData>) {
  const {
    campaignId,
    contactId,
    to,
    from,
    subject,
    html,
    text,
    replyTo,
    resendApiKey,
  } = job.data;

  console.log(`Processing email job ${job.id}: ${to}`);

  try {
    const resend = getResendClient(resendApiKey);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo,
      headers: campaignId
        ? {
            'X-Campaign-ID': campaignId,
          }
        : undefined,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Update email_sends record with Resend email ID
    if (campaignId) {
      await supabaseAdmin
        .from('email_sends')
        .update({
          status: EmailSendStatus.SENT,
          resend_email_id: data?.id,
          sent_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)
        .eq('contact_id', contactId);
    }

    console.log(`Email sent successfully to ${to} (Resend ID: ${data?.id})`);

    return { success: true, resendId: data?.id };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);

    // Update email_sends record with failure
    if (campaignId) {
      await supabaseAdmin
        .from('email_sends')
        .update({
          status: EmailSendStatus.FAILED,
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('campaign_id', campaignId)
        .eq('contact_id', contactId);
    }

    throw error;
  }
}

// Check if campaign is complete
async function checkCampaignCompletion(campaignId: string) {
  // Get counts of pending emails
  const { count: pendingCount } = await supabaseAdmin
    .from('email_sends')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', EmailSendStatus.PENDING);

  // If no pending emails, mark campaign as sent
  if (pendingCount === 0) {
    await supabaseAdmin
      .from('campaigns')
      .update({
        status: CampaignStatus.SENT,
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    console.log(`Campaign ${campaignId} marked as SENT`);
  }
}

// Create the worker
const emailWorker = new Worker<EmailJobData>(
  'email-sending',
  async (job) => {
    const result = await processEmailJob(job);

    // Check campaign completion after each email
    if (job.data.campaignId) {
      await checkCampaignCompletion(job.data.campaignId);
    }

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 emails concurrently
    limiter: {
      max: 100, // Max 100 jobs per duration
      duration: 1000, // Per 1 second (100 emails/second max)
    },
  }
);

// Worker event handlers
emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed for ${job.data.to}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed for ${job?.data.to}:`, err.message);
});

emailWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

emailWorker.on('ready', () => {
  console.log('Email worker is ready and waiting for jobs...');
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down email worker...');

  await emailWorker.close();
  await redisConnection.quit();

  console.log('Email worker shut down gracefully');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Email worker started');
console.log(
  `Connected to Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`
);
