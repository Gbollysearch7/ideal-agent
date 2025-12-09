import { Resend } from 'resend';

// Initialize Resend client lazily to avoid build errors
let _resend: Resend | null = null;

export const getResend = () => {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
};


export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a single email via Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: options.from || process.env.RESEND_FROM_EMAIL!,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      tags: options.tags,
      headers: options.headers,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Send a batch of emails via Resend
 */
export async function sendBatchEmails(
  emails: SendEmailOptions[]
): Promise<EmailResult[]> {
  try {
    const batchEmails = emails.map((email) => ({
      from: email.from || process.env.RESEND_FROM_EMAIL!,
      to: Array.isArray(email.to) ? email.to : [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
      tags: email.tags,
      headers: email.headers,
    }));

    const { data, error } = await getResend().batch.send(batchEmails);

    if (error) {
      return emails.map(() => ({ success: false, error: error.message }));
    }

    return (data?.data || []).map((result) => ({
      success: true,
      id: result.id,
    }));
  } catch (err) {
    return emails.map(() => ({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
  }
}

/**
 * Get email status from Resend
 */
export async function getEmailStatus(emailId: string) {
  try {
    const { data, error } = await getResend().emails.get(emailId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Template variable replacement
 */
export function replaceTemplateVariables(
  content: string,
  variables: Record<string, string | undefined>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

/**
 * Prepare email content with personalization
 */
export function prepareEmailContent(
  htmlTemplate: string,
  textTemplate: string | null,
  contact: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    metadata?: Record<string, any>;
  },
  additionalVariables?: Record<string, string>
): { html: string; text: string } {
  const variables: Record<string, string | undefined> = {
    email: contact.email,
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
    ...contact.metadata,
    ...additionalVariables,
  };

  const html = replaceTemplateVariables(htmlTemplate, variables);
  const text = textTemplate
    ? replaceTemplateVariables(textTemplate, variables)
    : stripHtml(html);

  return { html, text };
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create tracking pixel HTML
 */
export function createTrackingPixel(trackingId: string, baseUrl: string): string {
  return `<img src="${baseUrl}/api/tracking/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
}

/**
 * Wrap links for click tracking
 */
export function wrapLinksForTracking(
  html: string,
  trackingId: string,
  baseUrl: string
): string {
  return html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      // Don't track unsubscribe links
      if (url.includes('unsubscribe')) {
        return match;
      }

      const encodedUrl = encodeURIComponent(url);
      const trackingUrl = `${baseUrl}/api/tracking/click/${trackingId}?url=${encodedUrl}`;
      return `<a ${before}href="${trackingUrl}"${after}>`;
    }
  );
}
