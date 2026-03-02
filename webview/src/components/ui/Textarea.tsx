import { cn } from '../../utils/cn';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)] placeholder:opacity-50 resize-none',
        className
      )}
    />
  );
}
