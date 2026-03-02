import { cn } from '../../utils/cn';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded font-medium transition-opacity disabled:opacity-50 cursor-pointer',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-[var(--button-bg)] text-[var(--button-fg)] hover:opacity-90',
        variant === 'secondary' && 'bg-[var(--input-bg)] text-[var(--fg)] hover:opacity-90',
        variant === 'ghost' && 'bg-transparent text-[var(--fg)] hover:bg-[var(--hover-bg)]',
        variant === 'danger' && 'bg-red-700 text-white hover:opacity-90',
        className
      )}
    >
      {children}
    </button>
  );
}
