import { useState, useCallback, useRef } from 'react';
import { bridge } from '../services/bridge';
import { useSettingsStore } from '../stores/settingsStore';
import type { ChatMessage } from '../types/llm';

// LLM requests go through the extension host (Node.js) to avoid CORS restrictions.
// Webview -> LLM_STREAM_REQUEST -> Extension Host -> fetch -> LLM_STREAM_CHUNK -> Webview

export function useLLM() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRequestId = useRef<string | null>(null);
  const llmConfig = useSettingsStore((s) => s.llmConfig);

  const stream = useCallback(
    (messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<string> => {
      // Cancel any ongoing request
      if (currentRequestId.current) {
        bridge.send({ type: 'LLM_STREAM_CANCEL', payload: { requestId: currentRequestId.current } });
      }

      const requestId = Math.random().toString(36).slice(2) + Date.now();
      currentRequestId.current = requestId;

      setIsStreaming(true);
      setError(null);

      return new Promise<string>((resolve, reject) => {
        let fullContent = '';

        const unsubs = [
          bridge.on('LLM_STREAM_CHUNK', (payload) => {
            const p = payload as { requestId: string; content: string };
            if (p.requestId !== requestId) return;
            fullContent += p.content;
            onChunk?.(p.content);
          }),
          bridge.on('LLM_STREAM_DONE', (payload) => {
            const p = payload as { requestId: string };
            if (p.requestId !== requestId) return;
            cleanup();
            resolve(fullContent);
          }),
          bridge.on('LLM_STREAM_ERROR', (payload) => {
            const p = payload as { requestId: string; error: string };
            if (p.requestId !== requestId) return;
            cleanup();
            setError(p.error);
            reject(new Error(p.error));
          }),
        ];

        const cleanup = () => {
          unsubs.forEach((fn) => fn());
          currentRequestId.current = null;
          setIsStreaming(false);
        };

        bridge.send({
          type: 'LLM_STREAM_REQUEST',
          payload: { requestId, messages, config: llmConfig },
        });
      });
    },
    [llmConfig]
  );

  const cancel = useCallback(() => {
    if (currentRequestId.current) {
      bridge.send({ type: 'LLM_STREAM_CANCEL', payload: { requestId: currentRequestId.current } });
      currentRequestId.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { isStreaming, streamContent: '', error, stream, cancel, reset };
}
