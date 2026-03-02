import type { LLMConfig, ChatMessage, StreamChunk } from '../types/llm';

export async function* streamChat(
  config: LLMConfig,
  messages: ChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const base = config.endpoint.replace(/\/+$/, ''); // strip trailing slashes
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error ${response.status}: ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') {
        if (trimmed === 'data: [DONE]') {
          yield { content: '', done: true };
          return;
        }
        continue;
      }

      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content ?? '';
          if (content) {
            yield { content, done: false };
          }
        } catch {
          // skip malformed line
        }
      }
    }
  }

  yield { content: '', done: true };
}

export async function complete(
  config: LLMConfig,
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<string> {
  let result = '';
  for await (const chunk of streamChat(config, messages, signal)) {
    result += chunk.content;
  }
  return result;
}
