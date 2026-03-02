import { cn } from '../../utils/cn';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)] placeholder:opacity-50',
        className
      )}
    />
  );
}
