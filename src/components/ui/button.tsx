import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg',
        outline:
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground rounded-lg',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg',
        ghost: 'hover:bg-accent hover:text-accent-foreground rounded-lg',
        link: 'text-primary underline-offset-4 hover:underline',
        // Chronicle-style variants
        chronicle:
          'bg-foreground text-background hover:bg-foreground/90 rounded-none',
        'chronicle-outline':
          'border border-foreground/20 bg-transparent text-foreground hover:bg-foreground/5 rounded-none',
        'chronicle-ghost':
          'text-foreground/80 hover:text-foreground hover:bg-foreground/5 rounded-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        xl: 'h-14 px-10 text-lg',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
