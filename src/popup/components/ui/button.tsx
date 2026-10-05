import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-[hsl(221_83%_47%)] hover:shadow-paper',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-[hsl(217_28%_88%)]',
        outline:
          'border border-border/80 bg-white/86 text-foreground shadow-sm hover:bg-white',
        ghost:
          'text-muted-foreground hover:bg-secondary/78 hover:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-[hsl(0_76%_50%)]'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-2.5 text-[10px] leading-none tracking-[0.04em]',
        lg: 'h-11 rounded-lg px-5',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
