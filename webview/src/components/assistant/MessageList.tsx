import { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-3 p-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            'rounded p-3 text-sm',
            msg.role === 'user'
              ? 'ml-4 bg-[var(--button-bg)]/20 text-[var(--fg)]'
              : 'mr-4 bg-[var(--input-bg)] text-[var(--fg)]'
          )}
        >
          <div className="text-xs opacity-40 mb-1 font-medium">
            {msg.role === 'user' ? 'You' : 'SpecCraft AI'}
          </div>
          <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
