import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ChatPanel } from './components/assistant/ChatPanel';
import { useUIStore } from './stores/uiStore';
import { useSpecStore } from './stores/specStore';
import { useSettingsStore } from './stores/settingsStore';
import { bridge } from './services/bridge';

export function App() {
  const setSpecList = useSpecStore((s) => s.setSpecList);
  const setCurrentSpec = useSpecStore((s) => s.setCurrentSpec);
  const setLLMConfig = useSettingsStore((s) => s.setLLMConfig);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const unsubs = [
      bridge.on('SPEC_LIST_LOADED', (payload: any) => {
        setSpecList(payload?.specs ?? []);
      }),
      bridge.on('SPEC_LOADED', (payload: any) => {
        if (payload?.spec) {
          setCurrentSpec(payload.spec, payload.mdContent ?? '');
        }
      }),
      bridge.on('LLM_CONFIG_LOADED', (payload: any) => {
        if (payload) setLLMConfig(payload);
      }),
      bridge.on('SPEC_CREATED', (payload: any) => {
        addToast(`已创建：${payload?.specFile?.title ?? '新规格'}`, 'success');
      }),
      bridge.on('EXPORT_DONE', (payload: any) => {
        addToast(`已导出: ${payload?.path ?? ''}`, 'success');
      }),
      bridge.on('ERROR', (payload: any) => {
        addToast(payload?.message ?? 'An error occurred', 'error');
      }),
      bridge.on('APPLY_DONE', (payload: any) => {
        if (payload?.type === 'mapping') {
          addToast('测试映射已写入 .spec.json', 'success');
        } else {
          addToast('需求改进已应用到文档', 'success');
        }
      }),
    ];

    bridge.send({ type: 'LOAD_SPEC_LIST' });
    bridge.send({ type: 'LLM_CONFIG_GET' });

    return () => unsubs.forEach((fn) => fn());
  }, []);

  return (
    <AppShell>
      <ChatPanel />
    </AppShell>
  );
}
