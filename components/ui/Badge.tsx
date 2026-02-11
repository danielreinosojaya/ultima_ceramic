import React from 'react';
import { cn } from './cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'premium';
}

/**
 * Badge component for status indicators and labels
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
      success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      warning: 'bg-amber-100 text-amber-700 border border-amber-200',
      error: 'bg-red-100 text-red-700 border border-red-200',
      info: 'bg-blue-100 text-blue-700 border border-blue-200',
      premium: 'bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 border border-orange-200',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
