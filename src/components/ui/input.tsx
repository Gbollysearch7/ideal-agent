import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-all duration-200',
        'placeholder:text-muted-foreground',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'dark:bg-secondary/50',
        className
      )}
      {...props}
    />
  );
}

export { Input };
