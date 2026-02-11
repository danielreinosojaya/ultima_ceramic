import React, { useState } from 'react';
import { cn } from './cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Modern Button component with multiple variants and ripple effect
 * - primary: Gradient background with hover state
 * - secondary: Subtle background
 * - outline: Border style
 * - ghost: Minimal style for text-only buttons
 * - premium: High-end gradient with animation
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const variants = {
      primary:
        'bg-gradient-to-r from-brand-primary to-brand-primary/90 text-white hover:shadow-premium active:scale-[0.98]',
      secondary:
        'bg-brand-secondary/10 text-brand-text hover:bg-brand-secondary/20 active:scale-[0.98]',
      outline:
        'border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5 active:scale-[0.98]',
      ghost: 'text-brand-primary hover:bg-brand-primary/10 active:scale-[0.98]',
      premium:
        'bg-gradient-to-r from-amber-700 via-brand-secondary/85 to-brand-secondary text-white hover:shadow-premium-lg active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm rounded-lg',
      md: 'px-6 py-3 text-base rounded-xl',
      lg: 'px-8 py-4 text-lg rounded-2xl',
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples([...ripples, { id, x, y }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
      }

      props.onClick?.(e);
    };

    return (
      <button
        ref={ref}
        className={cn(
          'font-semibold transition-all duration-300 relative overflow-hidden',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple effect */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute bg-white/40 rounded-full pointer-events-none"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: '20px',
              height: '20px',
              animation: 'ripple 600ms ease-out',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        {/* Loading spinner */}
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </span>
        ) : (
          children
        )}

        <style>{`
          @keyframes ripple {
            to {
              transform: translate(-50%, -50%) scale(4);
              opacity: 0;
            }
          }
        `}</style>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
