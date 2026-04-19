import type { AiProviderConfig } from '../types';
import { createCodexProvider } from './codexProvider';
import { createOpenAiCompatProvider } from './openaiCompatProvider';
import type { AiProvider } from './types';

export const OPENAI_COMPAT_KEY_NAME = 'openai_compat_api_key';

export async function readApiKey(): Promise<string | null> {
  if (!window.novelStudio?.getSecret) return null;
  return window.novelStudio.getSecret(OPENAI_COMPAT_KEY_NAME);
}

export async function writeApiKey(value: string): Promise<boolean> {
  if (!window.novelStudio?.setSecret) return false;
  return window.novelStudio.setSecret(OPENAI_COMPAT_KEY_NAME, value);
}

export async function clearApiKey(): Promise<boolean> {
  if (!window.novelStudio?.deleteSecret) return false;
  return window.novelStudio.deleteSecret(OPENAI_COMPAT_KEY_NAME);
}

export async function hasApiKey(): Promise<boolean> {
  if (!window.novelStudio?.hasSecret) return false;
  return window.novelStudio.hasSecret(OPENAI_COMPAT_KEY_NAME);
}

export function pickProvider(config: AiProviderConfig): AiProvider {
  if (config.kind === 'openai_compat') {
    return createOpenAiCompatProvider({
      getConfig: () => config.openaiCompat,
      getApiKey: () => readApiKey(),
    });
  }
  return createCodexProvider();
}
