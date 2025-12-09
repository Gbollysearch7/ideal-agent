import { Worker, Job } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
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

        // Save to database
        await prisma.emailSend.create({
          data: {
            campaignId,
            contactId,
            userId,
            resendEmailId: result.data?.id || '',
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        // Update contact's last email sent date
        await prisma.contact.update({
          where: { id: contactId },
          data: { lastEmailSentAt: new Date() },
        });

        return {
          success: true,
          emailId: result.data?.id,
          to,
        };
      } catch (error) {
        // Log the failed send
        await prisma.emailSend.create({
          data: {
            campaignId,
            contactId,
            userId,
            status: 'BOUNCED',
            bounceReason:
              error instanceof Error ? error.message : 'Unknown error',
          },
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
    console.log(
      `Email job ${job.id} completed: sent to ${result.to}`
    );
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
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: {
          emailSends: true,
        },
      },
    },
  });

  if (!campaign) return;

  const totalSent = campaign._count.emailSends;

  if (
    campaign.status === 'SENDING' &&
    totalSent >= campaign.totalRecipients
  ) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        completedAt: new Date(),
      },
    });
  }
}

export default createEmailWorker;
