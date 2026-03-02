import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const variantClasses = {
  default: 'bg-[var(--input-bg)] text-[var(--fg)]',
  success: 'bg-green-800/60 text-green-300',
  warning: 'bg-yellow-800/60 text-yellow-300',
  error: 'bg-red-800/60 text-red-300',
  info: 'bg-blue-800/60 text-blue-300',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  );
}
