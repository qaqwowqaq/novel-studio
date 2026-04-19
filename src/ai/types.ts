import type { AiProviderConfig, AiProviderStatus } from '../types';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  signal?: AbortSignal;
  onDelta?: (chunk: string) => void;
}

export interface ChatResponse {
  content: string;
  providerLabel: string;
  modelVersion?: string;
}

export interface AiProvider {
  kind: AiProviderConfig['kind'];
  getStatus: () => Promise<AiProviderStatus>;
  sendChat: (req: ChatRequest) => Promise<ChatResponse>;
}
