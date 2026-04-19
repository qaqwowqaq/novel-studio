import type { AiProviderConfig, AiProviderStatus } from '../types';
import type { AiProvider, ChatRequest, ChatResponse } from './types';

interface OpenAiCompatFactory {
  getConfig: () => AiProviderConfig['openaiCompat'];
  getApiKey: () => Promise<string | null>;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed;
}

async function parseSseStream(
  response: Response,
  onDelta?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!response.body) throw new Error('响应没有内容流');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('取消', 'AbortError');
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return accumulated;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content
            ?? parsed?.choices?.[0]?.message?.content
            ?? '';
          if (delta) {
            accumulated += delta;
            if (onDelta) onDelta(accumulated);
          }
        } catch {
          // skip malformed chunk
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return accumulated;
}

export function createOpenAiCompatProvider(factory: OpenAiCompatFactory): AiProvider {
  return {
    kind: 'openai_compat',
    async getStatus(): Promise<AiProviderStatus> {
      const cfg = factory.getConfig();
      const baseUrl = normalizeBaseUrl(cfg.baseUrl);
      const label = cfg.providerLabel || 'OpenAI 兼容';
      if (!baseUrl) {
        return { kind: 'openai_compat', available: false, label, detail: '未设置 Base URL' };
      }
      if (!cfg.model) {
        return { kind: 'openai_compat', available: false, label, detail: '未设置模型名' };
      }
      const key = await factory.getApiKey();
      if (!key) {
        return { kind: 'openai_compat', available: false, label, detail: '未设置 API Key' };
      }
      return {
        kind: 'openai_compat',
        available: true,
        label,
        detail: `${cfg.model} @ ${baseUrl}`,
      };
    },
    async sendChat(req: ChatRequest): Promise<ChatResponse> {
      const cfg = factory.getConfig();
      const baseUrl = normalizeBaseUrl(cfg.baseUrl);
      if (!baseUrl) throw new Error('未设置 Base URL');
      if (!cfg.model) throw new Error('未设置模型名');
      const key = await factory.getApiKey();
      if (!key) throw new Error('未设置 API Key');

      const endpoint = `${baseUrl}/chat/completions`;
      const body = {
        model: cfg.model,
        temperature: cfg.temperature,
        stream: true,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: req.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`${response.status} ${response.statusText}${errText ? ` · ${errText.slice(0, 200)}` : ''}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/event-stream') || contentType.includes('stream')) {
        const content = await parseSseStream(response, req.onDelta, req.signal);
        return {
          content,
          providerLabel: cfg.providerLabel || 'OpenAI 兼容',
          modelVersion: cfg.model,
        };
      }

      // 非流式回退
      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      if (req.onDelta && content) req.onDelta(content);
      return {
        content,
        providerLabel: cfg.providerLabel || 'OpenAI 兼容',
        modelVersion: cfg.model,
      };
    },
  };
}
