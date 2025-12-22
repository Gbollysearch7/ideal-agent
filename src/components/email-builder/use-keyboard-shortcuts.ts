'use client';

import { useEffect, useCallback } from 'react';
import { BlockType } from './types';

interface KeyboardShortcutsConfig {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock: (type: BlockType) => void;
  onSave: () => void;
  onExport: () => void;
  onDeselect: () => void;
  hasSelection: boolean;
}

export const KEYBOARD_SHORTCUTS = [
  { key: '⌘/Ctrl + Z', action: 'Undo' },
  { key: '⌘/Ctrl + Shift + Z', action: 'Redo' },
  { key: '⌘/Ctrl + S', action: 'Save template' },
  { key: '⌘/Ctrl + E', action: 'Export HTML' },
  { key: 'Delete/Backspace', action: 'Delete selected block' },
  { key: '⌘/Ctrl + D', action: 'Duplicate selected block' },
  { key: '⌘/Ctrl + ↑', action: 'Move block up' },
  { key: '⌘/Ctrl + ↓', action: 'Move block down' },
  { key: 'Escape', action: 'Deselect block' },
  { key: '1', action: 'Add Text block' },
  { key: '2', action: 'Add Image block' },
  { key: '3', action: 'Add Button block' },
  { key: '4', action: 'Add Divider block' },
  { key: '5', action: 'Add Hero block' },
];

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  onSave,
  onExport,
  onDeselect,
  hasSelection,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if (cmdKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z
      if (cmdKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Save: Cmd/Ctrl + S
      if (cmdKey && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      // Export: Cmd/Ctrl + E
      if (cmdKey && e.key === 'e') {
        e.preventDefault();
        onExport();
        return;
      }

      // Delete: Delete or Backspace (when block selected)
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        onDelete();
        return;
      }

      // Duplicate: Cmd/Ctrl + D
      if (cmdKey && e.key === 'd' && hasSelection) {
        e.preventDefault();
        onDuplicate();
        return;
      }

      // Move up: Cmd/Ctrl + Up Arrow
      if (cmdKey && e.key === 'ArrowUp' && hasSelection) {
        e.preventDefault();
        onMoveUp();
        return;
      }

      // Move down: Cmd/Ctrl + Down Arrow
      if (cmdKey && e.key === 'ArrowDown' && hasSelection) {
        e.preventDefault();
        onMoveDown();
        return;
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        onDeselect();
        return;
      }

      // Quick add blocks with number keys (only when no modifier)
      if (!cmdKey && !e.altKey && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            onAddBlock('text');
            break;
          case '2':
            e.preventDefault();
            onAddBlock('image');
            break;
          case '3':
            e.preventDefault();
            onAddBlock('button');
            break;
          case '4':
            e.preventDefault();
            onAddBlock('divider');
            break;
          case '5':
            e.preventDefault();
            onAddBlock('hero');
            break;
        }
      }
    },
    [
      onUndo,
      onRedo,
      onDelete,
      onDuplicate,
      onMoveUp,
      onMoveDown,
      onAddBlock,
      onSave,
      onExport,
      onDeselect,
      hasSelection,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
