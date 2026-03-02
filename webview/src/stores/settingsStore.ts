import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMConfig } from '../types/llm';

interface SettingsState {
  llmConfig: LLMConfig;
  setLLMConfig: (config: LLMConfig) => void;
  updateLLMConfig: (partial: Partial<LLMConfig>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      llmConfig: {
        endpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
      },
      setLLMConfig: (config) => set({ llmConfig: config }),
      updateLLMConfig: (partial) =>
        set((state) => ({ llmConfig: { ...state.llmConfig, ...partial } })),
    }),
    { name: 'speccraft-settings' }
  )
);
