'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Code, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  EmailBuilder,
  EmailBlock,
  EmailTemplate,
  DEFAULT_GLOBAL_STYLES,
  AIImageImport,
  AIVariations,
  TemplateLibrary,
} from '@/components/email-builder';

export default function TemplateBuilderPage() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [globalStyles, setGlobalStyles] = useState(DEFAULT_GLOBAL_STYLES);
  const [isSaving, setIsSaving] = useState(false);
  const [showHTMLExport, setShowHTMLExport] = useState(false);
  const [exportedHTML, setExportedHTML] = useState('');

  const handleImportFromImage = useCallback(
    (importedBlocks: EmailBlock[], _imageUrl: string) => {
      setBlocks(importedBlocks);
      toast.success('Email generated from image!');
    },
    []
  );

  const handleSelectTemplate = useCallback(
    (
      templateBlocks: EmailBlock[],
      templateGlobalStyles?: Partial<EmailTemplate['globalStyles']>
    ) => {
      setBlocks(templateBlocks);
      if (templateGlobalStyles) {
        setGlobalStyles({ ...DEFAULT_GLOBAL_STYLES, ...templateGlobalStyles });
      }
      toast.success('Template applied!');
    },
    []
  );

  const handleApplySubject = useCallback(
    (newSubject: string, newPreviewText: string) => {
      setSubject(newSubject);
      setPreviewText(newPreviewText);
    },
    []
  );

  const handleApplyContent = useCallback(
    (headline: string, bodyText: string, ctaText: string) => {
      // Find and update hero or text blocks with the new content
      const updatedBlocks = [...blocks];
      let foundHero = false;
      let foundText = false;
      let foundButton = false;

      for (let i = 0; i < updatedBlocks.length; i++) {
        const block = updatedBlocks[i];
        if (block.type === 'hero' && !foundHero) {
          updatedBlocks[i] = {
            ...block,
            content: {
              ...block.content,
              title: headline,
              subtitle: bodyText.substring(0, 100),
            },
          };
          foundHero = true;
        } else if (block.type === 'text' && !foundText) {
          updatedBlocks[i] = {
            ...block,
            content: {
              ...block.content,
              text: bodyText,
            },
          };
          foundText = true;
        } else if (block.type === 'button' && !foundButton) {
          updatedBlocks[i] = {
            ...block,
            content: {
              ...block.content,
              text: ctaText,
            },
          };
          foundButton = true;
        }
      }

      setBlocks(updatedBlocks);
    },
    [blocks]
  );

  const generateHTML = useCallback(() => {
    // Generate HTML from blocks
    const renderBlockToHTML = (block: EmailBlock): string => {
      switch (block.type) {
        case 'header':
          return `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${block.styles?.backgroundColor || 'transparent'};">
              <tr>
                <td style="padding: ${block.styles?.padding || '20px'}; text-align: ${block.styles?.textAlign || 'center'};">
                  ${block.content.showLogo && block.content.logoUrl ? `<img src="${block.content.logoUrl}" alt="${block.content.logoAlt || 'Logo'}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
                  ${block.content.title ? `<h1 style="margin: 0 0 5px; font-size: 24px; font-weight: 600; color: ${block.styles?.textColor || globalStyles.textColor};">${block.content.title}</h1>` : ''}
                  ${block.content.subtitle ? `<p style="margin: 0; font-size: 14px; color: #666;">${block.content.subtitle}</p>` : ''}
                </td>
              </tr>
            </table>
          `;

        case 'text':
          const tag = block.content.heading || 'p';
          const fontSize =
            block.content.heading === 'h1'
              ? '28px'
              : block.content.heading === 'h2'
                ? '22px'
                : block.content.heading === 'h3'
                  ? '18px'
                  : '16px';
          return `
            <${tag} style="margin: 0; padding: ${block.styles?.padding || '10px 20px'}; font-size: ${fontSize}; line-height: 1.6; text-align: ${block.styles?.textAlign || 'left'}; color: ${block.styles?.textColor || globalStyles.textColor};">
              ${block.content.text}
            </${tag}>
          `;

        case 'button':
          return `
            <div style="padding: ${block.styles?.padding || '20px'}; text-align: ${block.styles?.textAlign || 'center'};">
              <a href="${block.content.link}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: ${block.styles?.buttonBorderRadius || '6px'}; background-color: ${block.styles?.buttonColor || globalStyles.primaryColor}; color: ${block.styles?.buttonTextColor || '#ffffff'};">
                ${block.content.text}
              </a>
            </div>
          `;

        case 'image':
          return `
            <div style="padding: ${block.styles?.padding || '10px 20px'}; text-align: ${block.styles?.textAlign || 'center'};">
              <img src="${block.content.src || 'https://placehold.co/600x300'}" alt="${block.content.alt}" style="max-width: 100%; width: ${block.content.width || '100%'}; height: auto; display: block; margin: 0 auto;">
            </div>
          `;

        case 'divider':
          return `
            <div style="padding: ${block.styles?.padding || '20px'};">
              <hr style="border: none; border-top: ${block.content.thickness || '1px'} ${block.content.style} ${block.content.color || '#e5e7eb'}; margin: 0;">
            </div>
          `;

        case 'spacer':
          return `<div style="height: ${block.content.height};"></div>`;

        case 'hero':
          return `
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color: ${block.content.backgroundColor || globalStyles.primaryColor}; ${block.content.backgroundImage ? `background-image: url(${block.content.backgroundImage}); background-size: cover; background-position: center;` : ''} padding: 60px 40px; text-align: center;">
                  <h1 style="margin: 0 0 15px; font-size: 36px; font-weight: 700; color: #ffffff;">${block.content.title}</h1>
                  ${block.content.subtitle ? `<p style="margin: 0 0 25px; font-size: 18px; color: rgba(255,255,255,0.9);">${block.content.subtitle}</p>` : ''}
                  ${block.content.buttonText ? `<a href="${block.content.buttonLink}" style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: ${block.content.backgroundColor || globalStyles.primaryColor}; text-decoration: none; border-radius: 6px; font-weight: 600;">${block.content.buttonText}</a>` : ''}
                </td>
              </tr>
            </table>
          `;

        case 'footer':
          return `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${block.styles?.backgroundColor || '#f4f4f5'};">
              <tr>
                <td style="padding: ${block.styles?.padding || '30px 20px'}; text-align: center; font-size: 12px; color: #666;">
                  ${block.content.companyName ? `<p style="margin: 0 0 5px; font-weight: 600;">${block.content.companyName}</p>` : ''}
                  ${block.content.address ? `<p style="margin: 0 0 15px;">${block.content.address}</p>` : ''}
                  ${block.content.showUnsubscribe ? `<p style="margin: 0 0 10px;"><a href="{{unsubscribeUrl}}" style="color: ${globalStyles.linkColor};">${block.content.unsubscribeText || 'Unsubscribe'}</a></p>` : ''}
                  ${block.content.copyrightText ? `<p style="margin: 0;">${block.content.copyrightText}</p>` : ''}
                </td>
              </tr>
            </table>
          `;

        default:
          return '';
      }
    };

    const blocksHTML = blocks.map(renderBlockToHTML).join('\n');

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject || 'Email'}</title>
  ${previewText ? `<!--[if !mso]><!--><span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</span><!--<![endif]-->` : ''}
  <style>
    body { margin: 0; padding: 0; font-family: ${globalStyles.fontFamily}; background-color: ${globalStyles.backgroundColor}; }
    a { color: ${globalStyles.linkColor}; }
    img { border: 0; max-width: 100%; height: auto; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${globalStyles.backgroundColor};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${globalStyles.backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table class="email-container" width="${parseInt(globalStyles.maxWidth)}" cellpadding="0" cellspacing="0" style="max-width: ${globalStyles.maxWidth}; background-color: ${globalStyles.contentBackgroundColor};">
          <tr>
            <td>
${blocksHTML}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }, [blocks, globalStyles, subject, previewText]);

  const handleExportHTML = () => {
    const html = generateHTML();
    setExportedHTML(html);
    setShowHTMLExport(true);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (blocks.length === 0) {
      toast.error('Please add some content to your template');
      return;
    }

    setIsSaving(true);
    try {
      const htmlContent = generateHTML();

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          subject: subject,
          htmlContent: htmlContent,
          previewText: previewText,
          category: 'custom',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      const data = await response.json();
      toast.success('Template saved successfully!');
      router.push(`/dashboard/templates/${data.id}`);
    } catch {
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="w-64">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              className="h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TemplateLibrary onSelectTemplate={handleSelectTemplate} />
          <AIImageImport onImport={handleImportFromImage} />
          <AIVariations
            currentSubject={subject}
            currentPreviewText={previewText}
            onApplySubject={handleApplySubject}
            onApplyContent={handleApplyContent}
          />
          <Button variant="outline" onClick={handleExportHTML}>
            <Code className="mr-2 h-4 w-4" />
            Export HTML
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Template
          </Button>
        </div>
      </div>

      {/* Email Builder */}
      <div className="flex-1 overflow-hidden">
        <EmailBuilder
          initialTemplate={{
            name: templateName,
            subject,
            previewText,
            blocks,
            globalStyles,
          }}
          onSave={async (template) => {
            setBlocks(template.blocks);
            setGlobalStyles(template.globalStyles);
            setSubject(template.subject);
            setPreviewText(template.previewText || '');
          }}
        />
      </div>

      {/* HTML Export Dialog */}
      <Dialog open={showHTMLExport} onOpenChange={setShowHTMLExport}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Export HTML</DialogTitle>
            <DialogDescription>
              Copy this HTML to use in your email campaigns
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <pre className="max-h-[500px] overflow-auto rounded-lg bg-stone-900 p-4 text-xs">
              <code>{exportedHTML}</code>
            </pre>
            <Button
              className="absolute top-2 right-2"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(exportedHTML);
                toast.success('HTML copied to clipboard');
              }}
            >
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
