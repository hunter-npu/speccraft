import { ToastContainer } from '../ui/Toast';
import { useUIStore } from '../../stores/uiStore';
import { SettingsModal } from '../settings/SettingsModal';
import { bridge } from '../../services/bridge';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const showSettings = useUIStore((s) => s.showSettings);
  const setShowSettings = useUIStore((s) => s.setShowSettings);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 shrink-0">
        <span className="text-base font-semibold text-[var(--fg)] opacity-90">软件规格</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => bridge.send({ type: 'NEW_SPEC' })}
            className="rounded px-2 py-0.5 text-xs font-medium text-[var(--fg)] opacity-50 hover:opacity-100 hover:bg-[var(--hover-bg)]"
            title="新建规格文档"
          >
            新建
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center w-7 h-7 rounded text-lg text-[var(--fg)] opacity-50 hover:opacity-100 hover:bg-[var(--hover-bg)]"
            title="设置"
          >
            &#9881;
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>
      <ToastContainer />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
