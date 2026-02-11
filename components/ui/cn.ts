import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence handling
 * Prevents conflicting Tailwind classes while allowing custom overrides
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
