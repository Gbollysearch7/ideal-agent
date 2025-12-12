import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Contact status enum
const ContactStatus = {
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
  BOUNCED: 'BOUNCED',
  COMPLAINED: 'COMPLAINED',
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return new NextResponse(renderErrorPage('Invalid unsubscribe link'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Verify the token matches the email
    const expectedToken = generateUnsubscribeToken(email);
    if (token !== expectedToken) {
      return new NextResponse(
        renderErrorPage('Invalid or expired unsubscribe link'),
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Check if contact exists
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, email, status, first_name')
      .eq('email', email.toLowerCase())
      .single();

    if (!contact) {
      return new NextResponse(renderErrorPage('Email address not found'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (contact.status === ContactStatus.UNSUBSCRIBED) {
      return new NextResponse(
        renderAlreadyUnsubscribedPage(contact.first_name || email),
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Show confirmation page
    return new NextResponse(
      renderConfirmationPage(email, token, contact.first_name),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('Unsubscribe page error:', error);
    return new NextResponse(renderErrorPage('Something went wrong'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, reason } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe request' },
        { status: 400 }
      );
    }

    // Verify the token
    const expectedToken = generateUnsubscribeToken(email);
    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 400 }
      );
    }

    // Update contact status to unsubscribed
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .update({
        status: ContactStatus.UNSUBSCRIBED,
        unsubscribed_at: new Date().toISOString(),
        unsubscribe_reason: reason || null,
      })
      .eq('email', email.toLowerCase())
      .select('id, email')
      .single();

    if (error || !contact) {
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    // Log the unsubscribe event
    console.log(
      `Contact unsubscribed: ${email}${reason ? ` - Reason: ${reason}` : ''}`
    );

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}

// Generate a simple HMAC token for unsubscribe verification
function generateUnsubscribeToken(email: string): string {
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

// Export for use in email sending
export { generateUnsubscribeToken };

function renderConfirmationPage(
  email: string,
  token: string,
  firstName?: string | null
): string {
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      color: #fafaf9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    p {
      color: #a8a29e;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .email {
      background: #171717;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-family: monospace;
      color: #fafaf9;
    }
    .reasons {
      text-align: left;
      margin-bottom: 24px;
    }
    .reason {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #171717;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .reason:hover { background: #262626; }
    .reason input { display: none; }
    .reason .radio {
      width: 20px;
      height: 20px;
      border: 2px solid #525252;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .reason input:checked + .radio {
      border-color: #fafaf9;
    }
    .reason input:checked + .radio::after {
      content: '';
      width: 10px;
      height: 10px;
      background: #fafaf9;
      border-radius: 50%;
    }
    .reason span { font-size: 14px; }
    button {
      width: 100%;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #fafaf9;
      color: #000;
    }
    .btn-primary:hover { background: #e7e5e4; }
    .btn-primary:disabled {
      background: #525252;
      color: #a8a29e;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: transparent;
      color: #a8a29e;
      margin-top: 12px;
    }
    .btn-secondary:hover { color: #fafaf9; }
    .success {
      display: none;
      padding: 40px 0;
    }
    .success svg {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
    }
    .loading { display: none; }
    .loading.show { display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div id="form-view">
      <h1>${greeting}</h1>
      <p>We're sorry to see you go. Please confirm you want to unsubscribe from our emails.</p>

      <div class="email">${email}</div>

      <div class="reasons">
        <label class="reason">
          <input type="radio" name="reason" value="too_many">
          <span class="radio"></span>
          <span>Too many emails</span>
        </label>
        <label class="reason">
          <input type="radio" name="reason" value="not_relevant">
          <span class="radio"></span>
          <span>Content not relevant to me</span>
        </label>
        <label class="reason">
          <input type="radio" name="reason" value="never_signed_up">
          <span class="radio"></span>
          <span>I never signed up</span>
        </label>
        <label class="reason">
          <input type="radio" name="reason" value="other">
          <span class="radio"></span>
          <span>Other reason</span>
        </label>
      </div>

      <button class="btn-primary" id="unsubscribe-btn" onclick="handleUnsubscribe()">
        <span class="loading" id="loading">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </path>
          </svg>
        </span>
        <span id="btn-text">Unsubscribe</span>
      </button>

      <button class="btn-secondary" onclick="window.close()">Cancel</button>
    </div>

    <div class="success" id="success-view">
      <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h1>Unsubscribed</h1>
      <p>You have been successfully unsubscribed. You will no longer receive emails from us.</p>
    </div>
  </div>

  <script>
    async function handleUnsubscribe() {
      const btn = document.getElementById('unsubscribe-btn');
      const loading = document.getElementById('loading');
      const btnText = document.getElementById('btn-text');
      const reasonInput = document.querySelector('input[name="reason"]:checked');

      btn.disabled = true;
      loading.classList.add('show');
      btnText.textContent = 'Processing...';

      try {
        const response = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: '${email}',
            token: '${token}',
            reason: reasonInput ? reasonInput.value : null
          })
        });

        if (response.ok) {
          document.getElementById('form-view').style.display = 'none';
          document.getElementById('success-view').style.display = 'block';
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to unsubscribe. Please try again.');
          btn.disabled = false;
          loading.classList.remove('show');
          btnText.textContent = 'Unsubscribe';
        }
      } catch (error) {
        alert('Something went wrong. Please try again.');
        btn.disabled = false;
        loading.classList.remove('show');
        btnText.textContent = 'Unsubscribe';
      }
    }
  </script>
</body>
</html>
  `;
}

function renderAlreadyUnsubscribedPage(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Already Unsubscribed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      color: #fafaf9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    svg {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    p {
      color: #a8a29e;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <svg viewBox="0 0 24 24" fill="none" stroke="#a8a29e" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h1>Already Unsubscribed</h1>
    <p>${name}, you are already unsubscribed from our emails. No further action is needed.</p>
  </div>
</body>
</html>
  `;
}

function renderErrorPage(message: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      color: #fafaf9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    svg {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    p {
      color: #a8a29e;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round"/>
    </svg>
    <h1>Oops!</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `;
}
