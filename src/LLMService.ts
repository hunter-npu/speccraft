import type { LLMConfigProvider } from './LLMConfigProvider';

export class LLMService {
  constructor(private readonly configProvider: LLMConfigProvider) {}

  async stream(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const config = this.configProvider.get();
    if (!config.apiKey || !config.endpoint) {
      throw new Error('LLM 未配置，请先执行 "SpecCraft: Configure LLM"');
    }
    const base = config.endpoint.replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages, stream: true }),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const cause = (err as any).cause;
      const detail = cause
        ? `${(err as Error).message}: ${(cause as Error).message ?? String(cause)}`
        : (err as Error).message;
      throw new Error(`网络错误: ${detail}`);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API 错误 ${response.status}: ${text}`);
    }
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'data: [DONE]') return;
          if (trimmed.startsWith('data: ')) {
            const raw = trimmed.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const json = JSON.parse(raw);
              const content = json.choices?.[0]?.delta?.content ?? '';
              if (content) onChunk(content);
              const finishReason = json.choices?.[0]?.finish_reason;
              if (finishReason && finishReason !== 'null') return;
            } catch { /* skip malformed */ }
          }
        }
      }
    } finally {
      reader.cancel();
    }
  }

  async complete(messages: Array<{ role: string; content: string }>): Promise<string> {
    const config = this.configProvider.get();

    if (!config.apiKey || !config.endpoint) {
      throw new Error('LLM 未配置，请先执行 "SpecCraft: Configure LLM"');
    }

    const base = config.endpoint.replace(/\/+$/, '');
    let response: Response;

    try {
      response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model: config.model, messages, stream: false }),
      });
    } catch (err) {
      const cause = (err as any).cause;
      const detail = cause
        ? `${(err as Error).message}: ${(cause as Error).message ?? String(cause)}`
        : (err as Error).message;
      throw new Error(`网络错误: ${detail}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API 错误 ${response.status}: ${text}`);
    }

    const json = (await response.json()) as any;
    const content: string = json.choices?.[0]?.message?.content ?? '';
    if (!content) {
      throw new Error('LLM 返回了空内容');
    }
    return content;
  }
}
