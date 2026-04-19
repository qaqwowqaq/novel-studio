import type { AiProviderStatus } from '../types';
import type { AiProvider, ChatRequest, ChatResponse } from './types';

function joinMessagesAsPrompt(messages: ChatRequest['messages']): string {
  return messages.map((m) => {
    if (m.role === 'system') return `[系统]\n${m.content}`;
    if (m.role === 'user') return `[用户]\n${m.content}`;
    return `[助手]\n${m.content}`;
  }).join('\n\n');
}

export function createCodexProvider(): AiProvider {
  return {
    kind: 'codex',
    async getStatus(): Promise<AiProviderStatus> {
      if (!window.novelStudio?.getCodexStatus) {
        return { kind: 'codex', available: false, label: 'Codex CLI', detail: '仅桌面版支持本地 Codex CLI' };
      }
      const res = await window.novelStudio.getCodexStatus();
      return {
        kind: 'codex',
        available: res.available,
        label: 'Codex CLI',
        detail: res.available ? (res.version || '已连接') : (res.detail || '未检测到 Codex CLI'),
      };
    },
    async sendChat(req: ChatRequest): Promise<ChatResponse> {
      if (!window.novelStudio?.runCodexPrompt) {
        throw new Error('Codex CLI 仅在桌面版可用');
      }
      const prompt = joinMessagesAsPrompt(req.messages);
      const requestId = `codex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      let aborted = false;
      const abortHandler = () => {
        aborted = true;
        void window.novelStudio?.cancelCodexPrompt?.(requestId);
      };
      if (req.signal) {
        if (req.signal.aborted) abortHandler();
        else req.signal.addEventListener('abort', abortHandler, { once: true });
      }

      try {
        const result = await window.novelStudio.runCodexPrompt({ prompt, requestId });
        if (req.onDelta) req.onDelta(result.content);
        return {
          content: result.content,
          providerLabel: 'Codex CLI',
          modelVersion: result.version,
        };
      } catch (error) {
        if (aborted) throw new DOMException('已取消', 'AbortError');
        throw error;
      } finally {
        req.signal?.removeEventListener('abort', abortHandler);
      }
    },
  };
}
