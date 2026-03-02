import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../utils/cn';

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={cn(
            'flex items-center gap-2 rounded border px-3 py-2 text-xs shadow-lg cursor-pointer max-w-xs',
            toast.type === 'success' && 'border-green-700 bg-green-900/80 text-green-200',
            toast.type === 'error' && 'border-red-700 bg-red-900/80 text-red-200',
            toast.type === 'info' && 'border-[var(--border)] bg-[var(--sidebar-bg)] text-[var(--fg)]'
          )}
        >
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
