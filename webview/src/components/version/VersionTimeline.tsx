import { useEffect } from 'react';
import { useGitStore } from '../../stores/gitStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

export function VersionTimeline() {
  const commits = useGitStore((s) => s.commits);
  const isLoading = useGitStore((s) => s.isLoading);
  const loadLog = useGitStore((s) => s.loadLog);
  const checkout = useGitStore((s) => s.checkout);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const handleCheckout = (hash: string) => {
    if (window.confirm(`Checkout commit ${hash.slice(0, 7)}? This will restore the spec to that version.`)) {
      checkout(hash);
      addToast('Checked out version', 'success');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-2 border-b border-[var(--border)]">
        <span className="text-xs font-medium">Version History</span>
        <Button variant="ghost" size="sm" onClick={loadLog}>&#8634; Refresh</Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center p-4"><Spinner /></div>
        )}
        {!isLoading && commits.length === 0 && (
          <div className="p-4 text-xs text-center opacity-40">No commits yet.</div>
        )}
        {commits.map((commit, index) => (
          <div key={commit.hash} className="flex gap-2 px-3 py-2 border-b border-[var(--border)]/30 hover:bg-[var(--hover-bg)]">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              {index < commits.length - 1 && <div className="w-0.5 flex-1 bg-[var(--border)] mt-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{commit.message}</div>
              <div className="text-[10px] opacity-50 mt-0.5">
                {commit.author} &middot; {new Date(commit.date).toLocaleDateString()}
              </div>
              <div className="text-[10px] font-mono opacity-40">{commit.hash.slice(0, 7)}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleCheckout(commit.hash)} title="Checkout">&#8617;</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
