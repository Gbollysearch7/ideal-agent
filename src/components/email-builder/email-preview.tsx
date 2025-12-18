'use client';

import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmailBlock, EmailTemplate } from './types';
import { BlockRenderer } from './block-renderer';
import { cn } from '@/lib/utils';

interface EmailPreviewProps {
  blocks: EmailBlock[];
  globalStyles: EmailTemplate['globalStyles'];
  subject?: string;
  previewText?: string;
}

export function EmailPreview({
  blocks,
  globalStyles,
  subject,
  previewText,
}: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const generateHTML = () => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject || 'Email'}</title>
  ${previewText ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</span>` : ''}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: ${globalStyles.fontFamily};
      background-color: ${globalStyles.backgroundColor};
      color: ${globalStyles.textColor};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    a {
      color: ${globalStyles.linkColor};
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse;
    }
    .email-container {
      max-width: ${globalStyles.maxWidth};
      margin: 0 auto;
      background-color: ${globalStyles.contentBackgroundColor};
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${globalStyles.backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table class="email-container" width="${globalStyles.maxWidth.replace('px', '')}" cellpadding="0" cellspacing="0" style="background-color: ${globalStyles.contentBackgroundColor};">
          <tr>
            <td>
              <!-- Email content will be rendered here -->
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  };

  return (
    <div className="flex h-full flex-col">
      {/* View Toggle */}
      <div className="flex items-center justify-center gap-2 border-b border-stone-800 p-3">
        <Button
          variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('desktop')}
          className="gap-2"
        >
          <Monitor className="h-4 w-4" />
          Desktop
        </Button>
        <Button
          variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('mobile')}
          className="gap-2"
        >
          <Smartphone className="h-4 w-4" />
          Mobile
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-stone-950 p-6">
        <div
          className={cn(
            'mx-auto overflow-hidden rounded-lg bg-white shadow-2xl transition-all duration-300',
            viewMode === 'desktop' ? 'max-w-[600px]' : 'max-w-[375px]'
          )}
        >
          {/* Email Wrapper */}
          <div
            style={{
              backgroundColor: globalStyles.backgroundColor,
              padding: viewMode === 'mobile' ? '10px' : '20px',
            }}
          >
            {/* Content Container */}
            <div
              style={{
                maxWidth:
                  viewMode === 'mobile' ? '100%' : globalStyles.maxWidth,
                margin: '0 auto',
                backgroundColor: globalStyles.contentBackgroundColor,
              }}
            >
              {blocks.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-stone-400">
                  <p>Add blocks to see your email preview</p>
                </div>
              ) : (
                blocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    globalStyles={globalStyles}
                    isPreview={true}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export HTML function for external use
export function generateEmailHTML(
  blocks: EmailBlock[],
  globalStyles: EmailTemplate['globalStyles'],
  subject?: string,
  previewText?: string
): string {
  // Generate inline HTML for each block
  const blocksHTML = blocks
    .map((block) => {
      // This would need to be implemented with server-side rendering
      // For now, we'll return placeholder
      return `<!-- Block: ${block.type} -->`;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject || 'Email'}</title>
  ${previewText ? `<!--[if !mso]><!--><span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</span><!--<![endif]-->` : ''}
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
