import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface SuggestionCardProps {
  title: string;
  content: string;
  onAccept?: () => void;
  onReject?: () => void;
  className?: string;
}

export function SuggestionCard({ title, content, onAccept, onReject, className }: SuggestionCardProps) {
  return (
    <div className={cn('rounded border border-[var(--accent)]/40 bg-[var(--input-bg)] p-3', className)}>
      <div className="text-xs font-medium text-[var(--accent)] mb-2">{title}</div>
      <pre className="text-xs whitespace-pre-wrap text-[var(--fg)] opacity-90 font-sans">{content}</pre>
      {(onAccept || onReject) && (
        <div className="flex gap-2 mt-3">
          {onAccept && <Button variant="primary" size="sm" onClick={onAccept}>Accept</Button>}
          {onReject && <Button variant="ghost" size="sm" onClick={onReject}>Dismiss</Button>}
        </div>
      )}
    </div>
  );
}
