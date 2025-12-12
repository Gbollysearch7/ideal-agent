import { Worker, Job } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import { supabaseAdmin } from '@/lib/supabase';
import { EmailJobData } from './email.queue';

// Create the email worker
export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email-sending',
    async (job: Job<EmailJobData>) => {
      const {
        campaignId,
        contactId,
        userId,
        to,
        from,
        subject,
        html,
        text,
        replyTo,
        resendApiKey,
      } = job.data;

      try {
        // Dynamic import of Resend to avoid issues with server components
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);

        // Send the email via Resend
        const result = await resend.emails.send({
          from,
          to,
          subject,
          html,
          text,
          replyTo,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        // Generate email send ID
        const emailSendId = `es_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

        // Save to database
        await supabaseAdmin.from('email_sends').insert({
          id: emailSendId,
          campaign_id: campaignId,
          contact_id: contactId,
          user_id: userId,
          resend_email_id: result.data?.id || '',
          status: 'SENT',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

        // Update contact's last email sent date
        await supabaseAdmin
          .from('contacts')
          .update({ last_email_sent_at: new Date().toISOString() })
          .eq('id', contactId);

        return {
          success: true,
          emailId: result.data?.id,
          to,
        };
      } catch (error) {
        // Generate email send ID for failed record
        const emailSendId = `es_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

        // Log the failed send
        await supabaseAdmin.from('email_sends').insert({
          id: emailSendId,
          campaign_id: campaignId,
          contact_id: contactId,
          user_id: userId,
          status: 'BOUNCED',
          bounce_reason:
            error instanceof Error ? error.message : 'Unknown error',
          created_at: new Date().toISOString(),
        });

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '10', 10),
      limiter: {
        max: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || '100', 10),
        duration: 60000, // 1 minute
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`Email job ${job.id} completed: sent to ${result.to}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Email job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} stalled`);
  });

  return worker;
}

// Campaign completion checker
export async function checkCampaignCompletion(campaignId: string) {
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, status, total_recipients')
    .eq('id', campaignId)
    .single();

  if (!campaign) return;

  // Count email sends for this campaign
  const { count: totalSent } = await supabaseAdmin
    .from('email_sends')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  if (
    campaign.status === 'SENDING' &&
    (totalSent || 0) >= campaign.total_recipients
  ) {
    await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'SENT',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
  }
}

export default createEmailWorker;
