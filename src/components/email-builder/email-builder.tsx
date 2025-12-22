'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Sparkles,
  Download,
  Upload,
  Settings,
  Palette,
  Undo,
  Redo,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  EmailBlock,
  EmailTemplate,
  BlockType,
  DEFAULT_GLOBAL_STYLES,
} from './types';
import { BlockPalette } from './block-palette';
import { BlockEditor } from './block-editor';
import { EmailPreview } from './email-preview';
import { toast } from 'sonner';

interface EmailBuilderProps {
  initialTemplate?: EmailTemplate;
  onSave?: (template: EmailTemplate) => Promise<void>;
  onExportHTML?: (html: string) => void;
}

// Generate unique ID
function generateId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create default block content based on type
function createDefaultBlock(type: BlockType): EmailBlock {
  const id = generateId();

  switch (type) {
    case 'header':
      return {
        id,
        type: 'header',
        content: {
          showLogo: true,
          logoUrl: '',
          title: 'Your Company',
          subtitle: 'Tagline goes here',
        },
      };
    case 'text':
      return {
        id,
        type: 'text',
        content: {
          text: 'Enter your text here...',
          heading: undefined,
        },
      };
    case 'image':
      return {
        id,
        type: 'image',
        content: {
          src: '',
          alt: 'Image description',
        },
      };
    case 'button':
      return {
        id,
        type: 'button',
        content: {
          text: 'Click Here',
          link: 'https://example.com',
          variant: 'primary',
        },
      };
    case 'divider':
      return {
        id,
        type: 'divider',
        content: {
          style: 'solid',
          color: '#e5e7eb',
          thickness: '1px',
        },
      };
    case 'spacer':
      return {
        id,
        type: 'spacer',
        content: {
          height: '20px',
        },
      };
    case 'columns':
      return {
        id,
        type: 'columns',
        content: {
          columns: [
            { width: '50%', blocks: [] },
            { width: '50%', blocks: [] },
          ],
        },
      };
    case 'social':
      return {
        id,
        type: 'social',
        content: {
          networks: [],
          iconStyle: 'color',
          iconSize: 'medium',
        },
      };
    case 'footer':
      return {
        id,
        type: 'footer',
        content: {
          companyName: 'Your Company',
          address: '123 Main St, City, State 12345',
          showUnsubscribe: true,
          unsubscribeText: 'Unsubscribe',
          copyrightText: '© 2024 Your Company. All rights reserved.',
        },
      };
    case 'hero':
      return {
        id,
        type: 'hero',
        content: {
          title: 'Big Announcement',
          subtitle: 'Discover something amazing',
          backgroundColor: '#000000',
          buttonText: 'Learn More',
          buttonLink: 'https://example.com',
        },
      };
    case 'product':
      return {
        id,
        type: 'product',
        content: {
          imageUrl: '',
          name: 'Product Name',
          description: 'Product description goes here',
          price: '$99',
          buttonText: 'Buy Now',
          buttonLink: 'https://example.com',
        },
      };
    case 'testimonial':
      return {
        id,
        type: 'testimonial',
        content: {
          quote: 'This product changed my life! Highly recommended.',
          authorName: 'John Doe',
          authorTitle: 'Happy Customer',
          rating: 5,
        },
      };
    case 'countdown':
      return {
        id,
        type: 'countdown',
        content: {
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Offer ends in:',
        },
      };
    case 'video':
      return {
        id,
        type: 'video',
        content: {
          thumbnailUrl: '',
          videoUrl: '',
          playButtonColor: 'rgba(0,0,0,0.7)',
        },
      };
    default:
      throw new Error(`Unknown block type: ${type}`);
  }
}

export function EmailBuilder({
  initialTemplate,
  onSave,
  onExportHTML,
}: EmailBuilderProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(
    initialTemplate?.blocks || []
  );
  const [globalStyles, setGlobalStyles] = useState<
    EmailTemplate['globalStyles']
  >(initialTemplate?.globalStyles || DEFAULT_GLOBAL_STYLES);
  const [subject, setSubject] = useState(initialTemplate?.subject || '');
  const [previewText, setPreviewText] = useState(
    initialTemplate?.previewText || ''
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [history, setHistory] = useState<EmailBlock[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // History management
  const pushHistory = useCallback(
    (newBlocks: EmailBlock[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newBlocks);
      if (newHistory.length > 50) newHistory.shift(); // Keep last 50 states
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setBlocks(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setBlocks(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Block operations
  const addBlock = useCallback(
    (type: BlockType) => {
      const newBlock = createDefaultBlock(type);
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      pushHistory(newBlocks);
      setSelectedBlockId(newBlock.id);
      toast.success(`Added ${type} block`);
    },
    [blocks, pushHistory]
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<EmailBlock>) => {
      const newBlocks = blocks.map((block) =>
        block.id === id ? ({ ...block, ...updates } as EmailBlock) : block
      );
      setBlocks(newBlocks);
      pushHistory(newBlocks);
    },
    [blocks, pushHistory]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const newBlocks = blocks.filter((block) => block.id !== id);
      setBlocks(newBlocks);
      pushHistory(newBlocks);
      if (selectedBlockId === id) {
        setSelectedBlockId(null);
      }
      toast.success('Block deleted');
    },
    [blocks, pushHistory, selectedBlockId]
  );

  const moveBlock = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const index = blocks.findIndex((block) => block.id === id);
      if (index === -1) return;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= blocks.length) return;

      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[newIndex]] = [
        newBlocks[newIndex],
        newBlocks[index],
      ];
      setBlocks(newBlocks);
      pushHistory(newBlocks);
    },
    [blocks, pushHistory]
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const blockIndex = blocks.findIndex((block) => block.id === id);
      if (blockIndex === -1) return;

      const original = blocks[blockIndex];
      const duplicate = { ...original, id: generateId() };
      const newBlocks = [
        ...blocks.slice(0, blockIndex + 1),
        duplicate,
        ...blocks.slice(blockIndex + 1),
      ];
      setBlocks(newBlocks);
      pushHistory(newBlocks);
      setSelectedBlockId(duplicate.id);
      toast.success('Block duplicated');
    },
    [blocks, pushHistory]
  );

  // Save template
  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave({
        name: '',
        subject,
        previewText,
        blocks,
        globalStyles,
      });
      toast.success('Template saved');
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={historyIndex === 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={historyIndex === history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>
          <div className="mx-2 h-4 w-px bg-stone-700" />
          {selectedBlockId && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => duplicateBlock(selectedBlockId)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Global Styles */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Palette className="h-4 w-4" />
                Design
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px]">
              <SheetHeader>
                <SheetTitle>Design Settings</SheetTitle>
                <SheetDescription>
                  Configure global styles for your email
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={globalStyles.backgroundColor}
                    onChange={(e) =>
                      setGlobalStyles({
                        ...globalStyles,
                        backgroundColor: e.target.value,
                      })
                    }
                    className="h-10 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content Background</Label>
                  <Input
                    type="color"
                    value={globalStyles.contentBackgroundColor}
                    onChange={(e) =>
                      setGlobalStyles({
                        ...globalStyles,
                        contentBackgroundColor: e.target.value,
                      })
                    }
                    className="h-10 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={globalStyles.primaryColor}
                    onChange={(e) =>
                      setGlobalStyles({
                        ...globalStyles,
                        primaryColor: e.target.value,
                      })
                    }
                    className="h-10 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <Input
                    type="color"
                    value={globalStyles.textColor}
                    onChange={(e) =>
                      setGlobalStyles({
                        ...globalStyles,
                        textColor: e.target.value,
                      })
                    }
                    className="h-10 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link Color</Label>
                  <Input
                    type="color"
                    value={globalStyles.linkColor}
                    onChange={(e) =>
                      setGlobalStyles({
                        ...globalStyles,
                        linkColor: e.target.value,
                      })
                    }
                    className="h-10 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Width</Label>
                  <Input
                    value={globalStyles.maxWidth}
                    onChange={(e) =>
                      setGlobalStyles({
                        ...globalStyles,
                        maxWidth: e.target.value,
                      })
                    }
                    placeholder="600px"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {onSave && (
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Subject & Preview Text */}
      <div className="grid grid-cols-2 gap-4 border-b border-stone-800 p-4">
        <div className="space-y-2">
          <Label>Subject Line</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
          />
        </div>
        <div className="space-y-2">
          <Label>Preview Text</Label>
          <Input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Preview text shown in inbox..."
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Block Palette */}
        <div className="w-64 flex-shrink-0 border-r border-stone-800">
          <Tabs defaultValue="blocks" className="h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-stone-800 bg-transparent px-2">
              <TabsTrigger
                value="blocks"
                className="data-[state=active]:bg-stone-800"
              >
                Blocks
              </TabsTrigger>
              <TabsTrigger
                value="layers"
                className="data-[state=active]:bg-stone-800"
              >
                Layers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="blocks" className="m-0 h-[calc(100%-41px)]">
              <ScrollArea className="h-full p-4">
                <BlockPalette onAddBlock={addBlock} />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="layers" className="m-0 h-[calc(100%-41px)]">
              <ScrollArea className="h-full p-4">
                <div className="space-y-2">
                  {blocks.length === 0 ? (
                    <p className="text-muted-foreground text-center text-sm">
                      No blocks added yet
                    </p>
                  ) : (
                    blocks.map((block, index) => (
                      <BlockEditor
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onUpdate={(updates) => updateBlock(block.id, updates)}
                        onDelete={() => deleteBlock(block.id)}
                        onMoveUp={() => moveBlock(block.id, 'up')}
                        onMoveDown={() => moveBlock(block.id, 'down')}
                        canMoveUp={index > 0}
                        canMoveDown={index < blocks.length - 1}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Area */}
        <div className="flex-1">
          <EmailPreview
            blocks={blocks}
            globalStyles={globalStyles}
            subject={subject}
            previewText={previewText}
          />
        </div>
      </div>
    </div>
  );
}
