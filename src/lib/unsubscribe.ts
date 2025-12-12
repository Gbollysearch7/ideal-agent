/**
 * Unsubscribe Token Utilities
 *
 * Generates and validates tokens for unsubscribe links.
 * Uses HMAC-like hashing with the NEXTAUTH_SECRET for security.
 */

/**
 * Generate a secure unsubscribe token for an email address
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
  const data = `unsubscribe:${email.toLowerCase()}`;

  // Simple hash function for token generation
  let hash = 0;
  const combined = data + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

/**
 * Validate an unsubscribe token for an email address
 */
export function validateUnsubscribeToken(
  email: string,
  token: string
): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

/**
 * Generate a full unsubscribe URL for an email address
 */
export function generateUnsubscribeUrl(
  email: string,
  baseUrl?: string
): string {
  const appUrl =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const token = generateUnsubscribeToken(email);
  return `${appUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
