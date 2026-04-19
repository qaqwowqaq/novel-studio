import { createDefaultAiConfig, createSeedData } from './sampleData';
import type { AppData } from './types';

const STORAGE_KEY = 'novel-studio-local-data';

const COVER_PALETTE = [
  '#c18a5f', '#6b8fb4', '#8fa97c', '#b57893',
  '#a07aa8', '#c09256', '#7aa3a3', '#8a7a9b',
];

function pickCoverColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return COVER_PALETTE[Math.abs(hash) % COVER_PALETTE.length];
}

function migrate(data: AppData): AppData {
  return {
    ...data,
    dailyRecords: data.dailyRecords ?? [],
    snapshots: data.snapshots ?? [],
    assets: data.assets ?? [],
    works: data.works.map((w) => ({
      ...w,
      relations: w.relations ?? [],
      aiMessages: w.aiMessages ?? [],
      volumes: w.volumes ?? [],
      foreshadows: w.foreshadows ?? [],
      createdAt: w.createdAt ?? w.updatedAt,
      cover: w.cover ?? { color: pickCoverColor(w.id || w.title) },
      lore: (w.lore ?? []).map((l) => ({
        ...l,
        aliases: l.aliases ?? [],
        attributes: l.attributes ?? {},
      })),
    })),
    preferences: {
      ...data.preferences,
      appearance: data.preferences.appearance ?? { theme: 'warm', font: 'serif', fontSize: 'medium' },
      ai: data.preferences.ai ?? createDefaultAiConfig(),
    },
    library: migrateLibrary(data.library),
  };
}

function migrateLibrary(lib: AppData['library']): AppData['library'] {
  if (!lib) return { collections: [], items: [] };
  const items = lib.items.map((it) => {
    if (it.imageAssetId && !it.body.includes(`asset:${it.imageAssetId}`)) {
      const prefix = `![${it.title || '图片'}](asset:${it.imageAssetId})\n\n`;
      return { ...it, body: prefix + it.body, imageAssetId: undefined };
    }
    return it;
  });
  return { ...lib, items };
}

export async function loadAppData(): Promise<AppData> {
  if (window.novelStudio?.loadData) {
    const payload = await window.novelStudio.loadData();
    return payload ? migrate(payload) : createSeedData();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'works' in parsed &&
      Array.isArray((parsed as AppData).works) &&
      'preferences' in parsed &&
      'metadata' in parsed
    ) {
      return migrate(parsed as AppData);
    }
  } catch {
    // corrupted or incompatible data
  }

  const seed = createSeedData();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

export async function saveAppData(data: AppData): Promise<{ savedAt: string }> {
  if (window.novelStudio?.saveData) {
    return window.novelStudio.saveData(data);
  }

  const savedAt = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return { savedAt };
}
