import React from 'react';
import { cn } from './cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

/**
 * Skeleton component for loading states with smooth animation
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    className,
    variant = 'rectangular',
    width,
    height,
    count = 1,
    style,
    ...props
  }, ref) => {
    const variants = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };

    const skeletons = Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : null}
        className={cn(
          'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse',
          variants[variant],
          className
        )}
        style={{
          width: width || '100%',
          height: height || (variant === 'text' ? '16px' : '100px'),
          ...style,
        } as React.CSSProperties}
        {...(i === 0 ? props : {})}
      />
    ));

    return count === 1 ? skeletons[0] : <div className="space-y-2">{skeletons}</div>;
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };
