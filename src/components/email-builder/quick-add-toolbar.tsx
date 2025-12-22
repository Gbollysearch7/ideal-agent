'use client';

import { useState } from 'react';
import {
  Type,
  Image,
  Square,
  Minus,
  Sparkles,
  Plus,
  ChevronDown,
  LayoutTemplate,
  Columns,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BlockType, BLOCK_LABELS } from './types';
import { cn } from '@/lib/utils';

interface QuickAddToolbarProps {
  onAddBlock: (type: BlockType) => void;
  className?: string;
}

const quickBlocks: {
  type: BlockType;
  icon: React.ReactNode;
  shortcut: string;
}[] = [
  { type: 'text', icon: <Type className="h-4 w-4" />, shortcut: '1' },
  { type: 'image', icon: <Image className="h-4 w-4" />, shortcut: '2' },
  { type: 'button', icon: <Square className="h-4 w-4" />, shortcut: '3' },
  { type: 'divider', icon: <Minus className="h-4 w-4" />, shortcut: '4' },
  { type: 'hero', icon: <Sparkles className="h-4 w-4" />, shortcut: '5' },
];

const moreBlocks: { type: BlockType; icon: React.ReactNode }[] = [
  { type: 'header', icon: <LayoutTemplate className="h-4 w-4" /> },
  { type: 'columns', icon: <Columns className="h-4 w-4" /> },
  { type: 'product', icon: <ShoppingBag className="h-4 w-4" /> },
  { type: 'footer', icon: <FileText className="h-4 w-4" /> },
];

export function QuickAddToolbar({
  onAddBlock,
  className,
}: QuickAddToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900/95 p-1 shadow-lg backdrop-blur-sm',
          className
        )}
      >
        {quickBlocks.map((block) => (
          <Tooltip key={block.type}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-stone-400 hover:bg-stone-800 hover:text-white"
                onClick={() => onAddBlock(block.type)}
              >
                {block.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span>{BLOCK_LABELS[block.type]}</span>
              <kbd className="rounded bg-stone-700 px-1.5 py-0.5 font-mono text-[10px]">
                {block.shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="mx-1 h-4 w-px bg-stone-700" />

        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-stone-400 hover:bg-stone-800 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              <ChevronDown className="ml-0.5 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Add Block</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {moreBlocks.map((block) => (
              <DropdownMenuItem
                key={block.type}
                onClick={() => {
                  onAddBlock(block.type);
                  setIsOpen(false);
                }}
                className="gap-2"
              >
                {block.icon}
                {BLOCK_LABELS[block.type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
