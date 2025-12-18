'use client';

import {
  Type,
  Image,
  Square,
  Minus,
  Columns,
  Share2,
  FileText,
  Sparkles,
  ShoppingBag,
  MessageSquareQuote,
  Timer,
  Play,
  LayoutTemplate,
  GripVertical,
} from 'lucide-react';
import { BlockType, BLOCK_LABELS } from './types';
import { cn } from '@/lib/utils';

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

interface BlockOption {
  type: BlockType;
  icon: React.ReactNode;
  description: string;
  category: 'basic' | 'content' | 'layout' | 'marketing';
}

const blockOptions: BlockOption[] = [
  // Basic blocks
  {
    type: 'header',
    icon: <LayoutTemplate className="h-5 w-5" />,
    description: 'Logo and title',
    category: 'basic',
  },
  {
    type: 'text',
    icon: <Type className="h-5 w-5" />,
    description: 'Paragraph or heading',
    category: 'basic',
  },
  {
    type: 'image',
    icon: <Image className="h-5 w-5" />,
    description: 'Single image',
    category: 'basic',
  },
  {
    type: 'button',
    icon: <Square className="h-5 w-5" />,
    description: 'Call-to-action',
    category: 'basic',
  },
  {
    type: 'divider',
    icon: <Minus className="h-5 w-5" />,
    description: 'Horizontal line',
    category: 'basic',
  },
  {
    type: 'spacer',
    icon: <GripVertical className="h-5 w-5" />,
    description: 'Empty space',
    category: 'basic',
  },

  // Layout blocks
  {
    type: 'columns',
    icon: <Columns className="h-5 w-5" />,
    description: '2-4 columns',
    category: 'layout',
  },

  // Content blocks
  {
    type: 'social',
    icon: <Share2 className="h-5 w-5" />,
    description: 'Social media links',
    category: 'content',
  },
  {
    type: 'footer',
    icon: <FileText className="h-5 w-5" />,
    description: 'Footer with unsubscribe',
    category: 'content',
  },

  // Marketing blocks
  {
    type: 'hero',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Hero banner',
    category: 'marketing',
  },
  {
    type: 'product',
    icon: <ShoppingBag className="h-5 w-5" />,
    description: 'Product card',
    category: 'marketing',
  },
  {
    type: 'testimonial',
    icon: <MessageSquareQuote className="h-5 w-5" />,
    description: 'Customer review',
    category: 'marketing',
  },
  {
    type: 'countdown',
    icon: <Timer className="h-5 w-5" />,
    description: 'Countdown timer',
    category: 'marketing',
  },
  {
    type: 'video',
    icon: <Play className="h-5 w-5" />,
    description: 'Video thumbnail',
    category: 'marketing',
  },
];

const categoryLabels = {
  basic: 'Basic',
  content: 'Content',
  layout: 'Layout',
  marketing: 'Marketing',
};

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const groupedBlocks = blockOptions.reduce(
    (acc, block) => {
      if (!acc[block.category]) {
        acc[block.category] = [];
      }
      acc[block.category].push(block);
      return acc;
    },
    {} as Record<string, BlockOption[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedBlocks).map(([category, blocks]) => (
        <div key={category}>
          <h3 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {blocks.map((block) => (
              <button
                key={block.type}
                onClick={() => onAddBlock(block.type)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3 transition-all',
                  'hover:border-stone-700 hover:bg-stone-800/50',
                  'focus:ring-2 focus:ring-stone-600 focus:outline-none'
                )}
              >
                <div className="text-stone-400">{block.icon}</div>
                <div className="text-center">
                  <p className="text-xs font-medium text-stone-200">
                    {BLOCK_LABELS[block.type]}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {block.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
