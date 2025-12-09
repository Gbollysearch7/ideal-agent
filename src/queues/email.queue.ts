import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '@/lib/redis';

// Email job data interface
export interface EmailJobData {
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

// Create the email queue
export const emailQueue = new Queue<EmailJobData>('email-sending', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
});

// Queue helper functions
export async function addEmailToQueue(data: EmailJobData) {
  return emailQueue.add('send-email', data, {
    priority: 1,
  });
}

export async function addBulkEmailsToQueue(emails: EmailJobData[]) {
  const jobs = emails.map((email) => ({
    name: 'send-email',
    data: email,
    opts: {
      priority: 1,
    },
  }));

  return emailQueue.addBulk(jobs);
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

export async function pauseQueue() {
  return emailQueue.pause();
}

export async function resumeQueue() {
  return emailQueue.resume();
}

export async function drainQueue() {
  return emailQueue.drain();
}

export async function cleanQueue(grace: number = 0) {
  await emailQueue.clean(grace, 1000, 'completed');
  await emailQueue.clean(grace, 1000, 'failed');
}

// Export queue events for monitoring
export const emailQueueEvents = new QueueEvents('email-sending', {
  connection: redisConnection,
});

export default emailQueue;
