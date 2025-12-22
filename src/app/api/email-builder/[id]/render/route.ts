import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface EmailBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  styles?: Record<string, string>;
}

interface GlobalStyles {
  backgroundColor: string;
  contentBackgroundColor: string;
  primaryColor: string;
  textColor: string;
  linkColor: string;
  fontFamily: string;
  maxWidth: string;
}

const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  backgroundColor: '#f4f4f5',
  contentBackgroundColor: '#ffffff',
  primaryColor: '#8b5cf6',
  textColor: '#18181b',
  linkColor: '#8b5cf6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  maxWidth: '600px',
};

// POST /api/email-builder/[id]/render - Render template to HTML
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { variables = {} } = body; // For template variable replacement

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    let blocks: EmailBlock[] = [];
    let globalStyles: GlobalStyles = DEFAULT_GLOBAL_STYLES;
    try {
      const content = JSON.parse(template.html_content || '{}');
      blocks = content.blocks || [];
      globalStyles = { ...DEFAULT_GLOBAL_STYLES, ...content.globalStyles };
    } catch {
      // Use defaults
    }

    const html = renderEmailToHTML(
      blocks,
      globalStyles,
      template.subject,
      template.preview_text,
      variables
    );

    return NextResponse.json({
      html,
      subject: replaceVariables(template.subject, variables),
      previewText: replaceVariables(template.preview_text, variables),
    });
  } catch (error) {
    console.error('Error in POST /api/email-builder/[id]/render:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/email-builder/[id]/render - Quick render (no variables)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    let blocks: EmailBlock[] = [];
    let globalStyles: GlobalStyles = DEFAULT_GLOBAL_STYLES;
    try {
      const content = JSON.parse(template.html_content || '{}');
      blocks = content.blocks || [];
      globalStyles = { ...DEFAULT_GLOBAL_STYLES, ...content.globalStyles };
    } catch {
      // Use defaults
    }

    const html = renderEmailToHTML(
      blocks,
      globalStyles,
      template.subject,
      template.preview_text,
      {}
    );

    // Return raw HTML for preview
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/email-builder/[id]/render:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function replaceVariables(
  text: string,
  variables: Record<string, string>
): string {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

function renderBlockToHTML(
  block: EmailBlock,
  globalStyles: GlobalStyles,
  variables: Record<string, string>
): string {
  const content = block.content as Record<string, unknown>;
  const styles = block.styles || {};

  const replaceVars = (text: unknown): string => {
    if (typeof text !== 'string') return '';
    return replaceVariables(text, variables);
  };

  switch (block.type) {
    case 'header':
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.backgroundColor || 'transparent'};">
          <tr>
            <td style="padding: ${styles.padding || '20px'}; text-align: ${styles.textAlign || 'center'};">
              ${content.showLogo && content.logoUrl ? `<img src="${content.logoUrl}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;" />` : ''}
              <h1 style="margin: 0; font-size: 24px; color: ${styles.textColor || globalStyles.textColor};">${replaceVars(content.title)}</h1>
              ${content.subtitle ? `<p style="margin: 5px 0 0; font-size: 14px; color: #666;">${replaceVars(content.subtitle)}</p>` : ''}
            </td>
          </tr>
        </table>
      `;

    case 'text':
      const tag = (content.heading as string) || 'p';
      const fontSize =
        content.heading === 'h1'
          ? '28px'
          : content.heading === 'h2'
            ? '22px'
            : content.heading === 'h3'
              ? '18px'
              : '16px';
      return `
        <${tag} style="margin: 0; padding: ${styles.padding || '10px 20px'}; font-size: ${fontSize}; line-height: 1.6; text-align: ${styles.textAlign || 'left'}; color: ${styles.textColor || globalStyles.textColor};">
          ${replaceVars(content.text)}
        </${tag}>
      `;

    case 'image':
      return `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: ${styles.padding || '10px 20px'}; text-align: ${styles.textAlign || 'center'};">
              <img src="${content.src}" alt="${replaceVars(content.alt)}" style="max-width: 100%; height: auto; border-radius: ${styles.borderRadius || '0'};" />
            </td>
          </tr>
        </table>
      `;

    case 'button':
      const buttonBg =
        content.variant === 'secondary'
          ? 'transparent'
          : globalStyles.primaryColor;
      const buttonColor =
        content.variant === 'secondary' ? globalStyles.primaryColor : '#ffffff';
      const buttonBorder =
        content.variant === 'secondary'
          ? `2px solid ${globalStyles.primaryColor}`
          : 'none';
      return `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: ${styles.padding || '10px 20px'}; text-align: ${styles.textAlign || 'center'};">
              <a href="${content.link}" style="display: inline-block; padding: 12px 24px; background-color: ${buttonBg}; color: ${buttonColor}; text-decoration: none; border-radius: 6px; font-weight: 600; border: ${buttonBorder};">
                ${replaceVars(content.text)}
              </a>
            </td>
          </tr>
        </table>
      `;

    case 'divider':
      return `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: ${styles.padding || '20px'};">
              <hr style="border: none; border-top: ${content.thickness || '1px'} ${content.style || 'solid'} ${content.color || '#e5e7eb'}; margin: 0;" />
            </td>
          </tr>
        </table>
      `;

    case 'spacer':
      return `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="height: ${content.height || '20px'};"></td>
          </tr>
        </table>
      `;

    case 'hero':
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${content.backgroundColor || '#000000'}; ${content.backgroundImage ? `background-image: url(${content.backgroundImage}); background-size: cover; background-position: center;` : ''}">
          <tr>
            <td style="padding: 60px 20px; text-align: center;">
              <h1 style="margin: 0 0 10px; font-size: 36px; color: #ffffff;">${replaceVars(content.title)}</h1>
              ${content.subtitle ? `<p style="margin: 0 0 30px; font-size: 18px; color: rgba(255,255,255,0.9);">${replaceVars(content.subtitle)}</p>` : ''}
              ${
                content.buttonText
                  ? `
                <a href="${content.buttonLink || '#'}" style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: ${content.backgroundColor || '#000000'}; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  ${replaceVars(content.buttonText)}
                </a>
              `
                  : ''
              }
            </td>
          </tr>
        </table>
      `;

    case 'product':
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.backgroundColor || 'transparent'};">
          <tr>
            <td style="padding: ${styles.padding || '20px'};">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                ${
                  content.imageUrl
                    ? `
                  <tr>
                    <td><img src="${content.imageUrl}" alt="${replaceVars(content.name)}" style="width: 100%; height: auto;" /></td>
                  </tr>
                `
                    : ''
                }
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 10px; font-size: 20px; color: ${globalStyles.textColor};">${replaceVars(content.name)}</h3>
                    <p style="margin: 0 0 15px; font-size: 14px; color: #666;">${replaceVars(content.description)}</p>
                    <p style="margin: 0 0 15px;">
                      <span style="font-size: 24px; font-weight: 700; color: ${globalStyles.primaryColor};">${replaceVars(content.price)}</span>
                      ${content.originalPrice ? `<span style="margin-left: 10px; font-size: 16px; color: #999; text-decoration: line-through;">${replaceVars(content.originalPrice)}</span>` : ''}
                    </p>
                    <a href="${content.buttonLink || '#'}" style="display: inline-block; padding: 12px 24px; background-color: ${globalStyles.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                      ${replaceVars(content.buttonText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;

    case 'testimonial':
      const rating = (content.rating as number) || 5;
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.backgroundColor || '#f9fafb'};">
          <tr>
            <td style="padding: ${styles.padding || '30px 20px'}; text-align: center;">
              <p style="font-size: 20px; margin: 0 0 15px; color: #fbbf24;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
              <p style="font-size: 18px; font-style: italic; margin: 0 0 20px; color: ${globalStyles.textColor};">"${replaceVars(content.quote)}"</p>
              ${content.authorImage ? `<img src="${content.authorImage}" alt="${replaceVars(content.authorName)}" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 10px;" />` : ''}
              <p style="margin: 0; font-weight: 600; color: ${globalStyles.textColor};">${replaceVars(content.authorName)}</p>
              ${content.authorTitle ? `<p style="margin: 5px 0 0; font-size: 14px; color: #666;">${replaceVars(content.authorTitle)}</p>` : ''}
            </td>
          </tr>
        </table>
      `;

    case 'footer':
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.backgroundColor || '#f4f4f5'};">
          <tr>
            <td style="padding: ${styles.padding || '30px 20px'}; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #666;">${replaceVars(content.companyName)}</p>
              ${content.address ? `<p style="margin: 0 0 10px; font-size: 12px; color: #999;">${replaceVars(content.address)}</p>` : ''}
              ${content.showUnsubscribe ? `<p style="margin: 0 0 10px;"><a href="{{unsubscribeUrl}}" style="font-size: 12px; color: ${globalStyles.linkColor};">${replaceVars(content.unsubscribeText) || 'Unsubscribe'}</a></p>` : ''}
              ${content.copyrightText ? `<p style="margin: 0; font-size: 12px; color: #999;">${replaceVars(content.copyrightText)}</p>` : ''}
            </td>
          </tr>
        </table>
      `;

    case 'social':
      const networks =
        (content.networks as Array<{ platform: string; url: string }>) || [];
      if (networks.length === 0) return '';
      return `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: ${styles.padding || '20px'}; text-align: center;">
              ${networks
                .map(
                  (n) => `
                <a href="${n.url}" style="display: inline-block; margin: 0 8px; color: ${globalStyles.linkColor}; text-decoration: none;">
                  ${n.platform.charAt(0).toUpperCase() + n.platform.slice(1)}
                </a>
              `
                )
                .join('')}
            </td>
          </tr>
        </table>
      `;

    default:
      return `<!-- Unknown block type: ${block.type} -->`;
  }
}

function renderEmailToHTML(
  blocks: EmailBlock[],
  globalStyles: GlobalStyles,
  subject: string,
  previewText: string,
  variables: Record<string, string>
): string {
  const blocksHTML = blocks
    .map((block) => renderBlockToHTML(block, globalStyles, variables))
    .join('\n');

  const subjectText = replaceVariables(subject, variables);
  const previewTextContent = replaceVariables(previewText, variables);

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subjectText || 'Email'}</title>
  ${previewTextContent ? `<!--[if !mso]><!--><span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewTextContent}</span><!--<![endif]-->` : ''}
  <!--[if mso]>
  <style>
    * { font-family: sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${globalStyles.fontFamily};
      background-color: ${globalStyles.backgroundColor};
      color: ${globalStyles.textColor};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    a {
      color: ${globalStyles.linkColor};
      text-decoration: underline;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      max-width: 100%;
      height: auto;
    }
    table {
      border-collapse: collapse;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-padding {
        padding-left: 15px !important;
        padding-right: 15px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${globalStyles.backgroundColor};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${globalStyles.backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!--[if mso]>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${parseInt(globalStyles.maxWidth)}">
        <tr>
        <td>
        <![endif]-->
        <table class="email-container" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: ${globalStyles.maxWidth}; margin: 0 auto; background-color: ${globalStyles.contentBackgroundColor};">
          <tr>
            <td>
              ${blocksHTML}
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
