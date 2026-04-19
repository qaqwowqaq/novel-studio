import { useCallback, useState } from 'react';

const STORAGE_KEY = 'palette-action-usage-v1';

interface UsageEntry { count: number; lastAt: number }
type UsageMap = Record<string, UsageEntry>;

export interface ActionUsageApi {
  record: (id: string) => void;
  topIds: (ids: string[], n: number) => string[];
}

function loadUsage(): UsageMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as UsageMap;
  } catch {
    /* noop */
  }
  return {};
}

export function useActionUsage(): ActionUsageApi {
  const [usage, setUsage] = useState<UsageMap>(loadUsage);

  const record = useCallback((id: string) => {
    setUsage((cur) => {
      const prev = cur[id];
      const next: UsageMap = {
        ...cur,
        [id]: { count: (prev?.count ?? 0) + 1, lastAt: Date.now() },
      };
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const topIds = useCallback((ids: string[], n: number): string[] => {
    return ids
      .filter((id) => usage[id])
      .sort((a, b) => {
        const ua = usage[a];
        const ub = usage[b];
        if (ub.lastAt !== ua.lastAt) return ub.lastAt - ua.lastAt;
        return ub.count - ua.count;
      })
      .slice(0, n);
  }, [usage]);

  return { record, topIds };
}
