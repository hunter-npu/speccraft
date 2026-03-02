import { useState } from 'react';
import { useLLM } from '../../hooks/useLLM';
import { useSpecStore } from '../../stores/specStore';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { MessageList } from './MessageList';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import type { ChatMessage } from '../../types/llm';
import { buildSystemPrompt } from '../../utils/prompts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const { stream, isStreaming, cancel } = useLLM();
  const currentSpec = useSpecStore((s) => s.currentSpec);
  const currentMdContent = useSpecStore((s) => s.currentMdContent);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const llmConfig = useSettingsStore((s) => s.llmConfig);
  const hasApiKey = llmConfig.apiKey.trim().length > 0;

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (isStreaming) cancel();

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    const llmMessages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(currentMdContent) },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: text },
    ];

    try {
      let accumulated = '';
      await stream(llmMessages, (chunk) => {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
        );
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `❌ ${detail}\n\n当前配置：\n  端点: ${llmConfig.endpoint}\n  模型: ${llmConfig.model}\n  Key: ${llmConfig.apiKey ? '已填写' : '❌ 未填写'}`,
              }
            : m
        )
      );
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    await handleSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Current file indicator + clear button */}
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        {currentSpec ? (
          <span className="text-sm truncate max-w-[calc(100%-2.5rem)]">
            <span className="opacity-40">当前：</span>
            <span className="font-medium">{currentSpec.title}</span>
          </span>
        ) : (
          <span className="text-sm opacity-30 italic">未打开规格文档</span>
        )}
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs opacity-40 hover:opacity-80 ml-2 shrink-0"
            title="清空对话"
          >
            清空
          </button>
        )}
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2 p-3">
            {currentSpec ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSendMessage('请分析当前规格说明文档，指出可以改进的地方。')}
                  className="rounded bg-[var(--input-bg)] px-3 py-1.5 text-sm hover:bg-[var(--hover-bg)] text-left"
                >
                  📄 分析文档
                </button>
                <button
                  onClick={() => handleSendMessage('请检查当前规格说明是否完整，有无遗漏的需求或模糊的表述。')}
                  className="rounded bg-[var(--input-bg)] px-3 py-1.5 text-sm hover:bg-[var(--hover-bg)] text-left"
                >
                  🔍 检查完整性
                </button>
              </div>
            ) : (
              <div className="text-sm text-center opacity-40 py-6">
                打开一个 .spec.md 文件<br />AI 助手将自动获取文档内容
              </div>
            )}
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-[var(--border)] px-3 pt-2 pb-3">
        {!hasApiKey && (
          <div
            onClick={() => setShowSettings(true)}
            className="mb-2 flex items-center gap-1.5 rounded border border-yellow-700/50 bg-yellow-900/20 px-2 py-1.5 text-sm text-yellow-300 cursor-pointer hover:bg-yellow-900/40"
          >
            <span>⚠</span>
            <span>未配置 API Key，点击此处设置</span>
          </div>
        )}
        {hasApiKey && (
          <div className="mb-1.5 flex items-center gap-1 text-xs opacity-40">
            <span>●</span>
            <span>
              {llmConfig.model} · {llmConfig.endpoint.replace(/https?:\/\//, '').split('/')[0]}
            </span>
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          rows={4}
          className="w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)] resize-none placeholder:opacity-50 leading-relaxed"
        />
        <div className="flex gap-2 mt-2 justify-end mr-1">
          {isStreaming && (
            <Button variant="ghost" size="md" onClick={cancel}>
              停止
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? <Spinner className="w-4 h-4" /> : '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
}
