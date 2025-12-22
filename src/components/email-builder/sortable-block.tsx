'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailBlock, BLOCK_LABELS } from './types';

interface SortableBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

export function SortableBlock({
  block,
  isSelected,
  onSelect,
  children,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-lg border transition-all',
        isDragging && 'z-50 opacity-50',
        isSelected
          ? 'border-violet-500 bg-stone-900 ring-1 ring-violet-500/20'
          : 'border-stone-800 bg-stone-900/50 hover:border-stone-700'
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 bottom-0 left-0 flex w-8 cursor-grab items-center justify-center rounded-l-lg bg-stone-800/50 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
        style={{ opacity: isDragging ? 1 : undefined }}
      >
        <GripVertical className="h-4 w-4 text-stone-400" />
      </div>

      {/* Block Label Badge */}
      <div className="absolute -top-2 left-10 z-10">
        <span className="rounded bg-stone-700 px-2 py-0.5 text-[10px] font-medium text-stone-300">
          {BLOCK_LABELS[block.type]}
        </span>
      </div>

      {children}
    </div>
  );
}
