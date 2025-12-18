'use client';

import { useState } from 'react';
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { EmailBlock, BLOCK_LABELS } from './types';
import { cn } from '@/lib/utils';

interface BlockEditorProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<EmailBlock>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function BlockEditor({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: BlockEditorProps) {
  const [isStylesOpen, setIsStylesOpen] = useState(false);

  const updateContent = (key: string, value: unknown) => {
    onUpdate({
      content: { ...block.content, [key]: value },
    } as Partial<EmailBlock>);
  };

  const updateStyles = (key: string, value: string) => {
    onUpdate({
      styles: { ...block.styles, [key]: value },
    });
  };

  const renderContentEditor = () => {
    switch (block.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Show Logo</Label>
              <Switch
                checked={block.content.showLogo}
                onCheckedChange={(checked) =>
                  updateContent('showLogo', checked)
                }
              />
            </div>
            {block.content.showLogo && (
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={block.content.logoUrl || ''}
                  onChange={(e) => updateContent('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={block.content.title || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={block.content.subtitle || ''}
                onChange={(e) => updateContent('subtitle', e.target.value)}
                placeholder="Tagline or description"
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Text Type</Label>
              <Select
                value={block.content.heading || 'p'}
                onValueChange={(value) =>
                  updateContent('heading', value === 'p' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">Heading 1</SelectItem>
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="h3">Heading 3</SelectItem>
                  <SelectItem value="p">Paragraph</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={block.content.text}
                onChange={(e) => updateContent('text', e.target.value)}
                placeholder="Enter your text here..."
                rows={4}
              />
              <p className="text-muted-foreground text-xs">
                Supports basic HTML: &lt;b&gt;, &lt;i&gt;, &lt;a&gt;, &lt;br&gt;
              </p>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={block.content.src}
                onChange={(e) => updateContent('src', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input
                value={block.content.alt}
                onChange={(e) => updateContent('alt', e.target.value)}
                placeholder="Image description"
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <Input
                value={block.content.link || ''}
                onChange={(e) => updateContent('link', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Width</Label>
              <Select
                value={block.content.width || '100%'}
                onValueChange={(value) => updateContent('width', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100%">Full width</SelectItem>
                  <SelectItem value="75%">75%</SelectItem>
                  <SelectItem value="50%">50%</SelectItem>
                  <SelectItem value="300px">300px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={block.content.text}
                onChange={(e) => updateContent('text', e.target.value)}
                placeholder="Click here"
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={block.content.link}
                onChange={(e) => updateContent('link', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Style</Label>
              <Select
                value={block.content.variant || 'primary'}
                onValueChange={(value) => updateContent('variant', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (filled)</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Button Color</Label>
              <Input
                type="color"
                value={block.styles?.buttonColor || '#000000'}
                onChange={(e) => updateStyles('buttonColor', e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Style</Label>
              <Select
                value={block.content.style}
                onValueChange={(value) => updateContent('style', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={block.content.color || '#e5e7eb'}
                onChange={(e) => updateContent('color', e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-2">
            <Label>Height</Label>
            <Select
              value={block.content.height}
              onValueChange={(value) => updateContent('height', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10px">Small (10px)</SelectItem>
                <SelectItem value="20px">Medium (20px)</SelectItem>
                <SelectItem value="40px">Large (40px)</SelectItem>
                <SelectItem value="60px">Extra Large (60px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={block.content.title}
                onChange={(e) => updateContent('title', e.target.value)}
                placeholder="Big Announcement"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={block.content.subtitle || ''}
                onChange={(e) => updateContent('subtitle', e.target.value)}
                placeholder="Supporting text"
              />
            </div>
            <div className="space-y-2">
              <Label>Background Image URL</Label>
              <Input
                value={block.content.backgroundImage || ''}
                onChange={(e) =>
                  updateContent('backgroundImage', e.target.value)
                }
                placeholder="https://example.com/hero.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <Input
                type="color"
                value={block.content.backgroundColor || '#000000'}
                onChange={(e) =>
                  updateContent('backgroundColor', e.target.value)
                }
                className="h-10 w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={block.content.buttonText || ''}
                onChange={(e) => updateContent('buttonText', e.target.value)}
                placeholder="Shop Now"
              />
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input
                value={block.content.buttonLink || ''}
                onChange={(e) => updateContent('buttonLink', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
        );

      case 'product':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Image URL</Label>
              <Input
                value={block.content.imageUrl}
                onChange={(e) => updateContent('imageUrl', e.target.value)}
                placeholder="https://example.com/product.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={block.content.name}
                onChange={(e) => updateContent('name', e.target.value)}
                placeholder="Product Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={block.content.description || ''}
                onChange={(e) => updateContent('description', e.target.value)}
                placeholder="Short description"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  value={block.content.price}
                  onChange={(e) => updateContent('price', e.target.value)}
                  placeholder="$99"
                />
              </div>
              <div className="space-y-2">
                <Label>Original Price</Label>
                <Input
                  value={block.content.originalPrice || ''}
                  onChange={(e) =>
                    updateContent('originalPrice', e.target.value)
                  }
                  placeholder="$149"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={block.content.buttonText}
                onChange={(e) => updateContent('buttonText', e.target.value)}
                placeholder="Buy Now"
              />
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input
                value={block.content.buttonLink}
                onChange={(e) => updateContent('buttonLink', e.target.value)}
                placeholder="https://example.com/product"
              />
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={block.content.companyName || ''}
                onChange={(e) => updateContent('companyName', e.target.value)}
                placeholder="Company Inc."
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={block.content.address || ''}
                onChange={(e) => updateContent('address', e.target.value)}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Unsubscribe Link</Label>
              <Switch
                checked={block.content.showUnsubscribe}
                onCheckedChange={(checked) =>
                  updateContent('showUnsubscribe', checked)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Copyright Text</Label>
              <Input
                value={block.content.copyrightText || ''}
                onChange={(e) => updateContent('copyrightText', e.target.value)}
                placeholder="&copy; 2024 Company Inc. All rights reserved."
              />
            </div>
          </div>
        );

      case 'testimonial':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quote</Label>
              <Textarea
                value={block.content.quote}
                onChange={(e) => updateContent('quote', e.target.value)}
                placeholder="This product changed my life..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Author Name</Label>
              <Input
                value={block.content.authorName}
                onChange={(e) => updateContent('authorName', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Author Title</Label>
              <Input
                value={block.content.authorTitle || ''}
                onChange={(e) => updateContent('authorTitle', e.target.value)}
                placeholder="CEO, Company"
              />
            </div>
            <div className="space-y-2">
              <Label>Rating (1-5)</Label>
              <Select
                value={String(block.content.rating || 5)}
                onValueChange={(value) =>
                  updateContent('rating', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {'★'.repeat(n)}
                      {'☆'.repeat(5 - n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Add your social media links. Leave URL empty to hide a network.
            </p>
            {['facebook', 'twitter', 'instagram', 'linkedin', 'youtube'].map(
              (platform) => {
                const existing = block.content.networks.find(
                  (n) => n.platform === platform
                );
                return (
                  <div key={platform} className="space-y-2">
                    <Label className="capitalize">{platform}</Label>
                    <Input
                      value={existing?.url || ''}
                      onChange={(e) => {
                        const networks = block.content.networks.filter(
                          (n) => n.platform !== platform
                        );
                        if (e.target.value) {
                          networks.push({
                            platform: platform as
                              | 'facebook'
                              | 'twitter'
                              | 'instagram'
                              | 'linkedin'
                              | 'youtube',
                            url: e.target.value,
                          });
                        }
                        updateContent('networks', networks);
                      }}
                      placeholder={`https://${platform}.com/yourpage`}
                    />
                  </div>
                );
              }
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Video Thumbnail URL</Label>
              <Input
                value={block.content.thumbnailUrl}
                onChange={(e) => updateContent('thumbnailUrl', e.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input
                value={block.content.videoUrl}
                onChange={(e) => updateContent('videoUrl', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        );

      default:
        return (
          <p className="text-muted-foreground text-sm">
            No editor available for this block type.
          </p>
        );
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isSelected
          ? 'border-stone-500 bg-stone-900'
          : 'border-stone-800 bg-stone-900/50 hover:border-stone-700'
      )}
    >
      {/* Block Header */}
      <div
        className="flex cursor-pointer items-center justify-between p-3"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 cursor-grab text-stone-500" />
          <span className="text-sm font-medium">
            {BLOCK_LABELS[block.type]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      {isSelected && (
        <div className="border-t border-stone-800 p-4">
          {renderContentEditor()}

          {/* Styles Section */}
          <Collapsible
            open={isStylesOpen}
            onOpenChange={setIsStylesOpen}
            className="mt-4"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-stone-800/50 px-3 py-2 text-sm font-medium">
              Advanced Styles
              {isStylesOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Background</Label>
                  <Input
                    type="color"
                    value={block.styles?.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      updateStyles('backgroundColor', e.target.value)
                    }
                    className="h-8 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Text Color</Label>
                  <Input
                    type="color"
                    value={block.styles?.textColor || '#333333'}
                    onChange={(e) => updateStyles('textColor', e.target.value)}
                    className="h-8 w-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Padding</Label>
                <Select
                  value={block.styles?.padding || '10px 20px'}
                  onValueChange={(value) => updateStyles('padding', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="10px 20px">Small</SelectItem>
                    <SelectItem value="20px 30px">Medium</SelectItem>
                    <SelectItem value="30px 40px">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Text Align</Label>
                <Select
                  value={block.styles?.textAlign || 'left'}
                  onValueChange={(value) => updateStyles('textAlign', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
