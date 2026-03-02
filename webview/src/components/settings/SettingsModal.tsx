import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import { bridge } from '../../services/bridge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const llmConfig = useSettingsStore((s) => s.llmConfig);
  const setLLMConfig = useSettingsStore((s) => s.setLLMConfig);
  const addToast = useUIStore((s) => s.addToast);
  const [draft, setDraft] = useState(llmConfig);

  const handleSave = () => {
    setLLMConfig(draft);
    bridge.send({ type: 'LLM_CONFIG_SET', payload: draft });
    addToast('Settings saved', 'success');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="LLM Settings">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] opacity-60 mb-1 block">API Endpoint</label>
          <Input
            value={draft.endpoint}
            onChange={(e) => setDraft((p) => ({ ...p, endpoint: e.target.value }))}
            placeholder="https://api.openai.com/v1"
          />
        </div>
        <div>
          <label className="text-[11px] opacity-60 mb-1 block">API Key</label>
          <Input
            type="password"
            value={draft.apiKey}
            onChange={(e) => setDraft((p) => ({ ...p, apiKey: e.target.value }))}
            placeholder="sk-..."
          />
        </div>
        <div>
          <label className="text-[11px] opacity-60 mb-1 block">Model</label>
          <Input
            value={draft.model}
            onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))}
            placeholder="gpt-4o-mini"
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
