import React from 'react';
import { cn } from './cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'premium';
  interactive?: boolean;
}

/**
 * Card component with multiple style variants
 * - default: Standard white card with subtle shadow
 * - elevated: Premium card with stronger shadows and hover effect
 * - glass: Glassmorphism effect with backdrop blur
 * - premium: High-end card with gradient and advanced shadows
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', interactive = false, ...props }, ref) => {
    const variants = {
      default: 'bg-white rounded-2xl border border-brand-border/50 shadow-subtle',
      elevated: 'bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-white/60 shadow-premium hover:shadow-premium-hover transition-all duration-300',
      glass: 'backdrop-blur-xl bg-white/[0.72] border border-white/20 rounded-2xl shadow-glass',
      premium: 'bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl border border-white/80 shadow-premium-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          interactive && 'cursor-pointer hover:scale-[1.02] transition-transform duration-300',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
