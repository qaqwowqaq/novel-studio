import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createSeedData } from '../src/sampleData';
import type { AppData } from '../src/types';

const appData = process.env.APPDATA;
if (!appData) {
  console.error('APPDATA env var not set; cannot locate storage file.');
  process.exit(1);
}
const storagePath = path.join(appData, 'novel-studio', 'novel-studio-data.json');

const raw = await readFile(storagePath, 'utf8');
const current = JSON.parse(raw) as AppData;
await copyFile(storagePath, storagePath + '.bak');

const fresh = createSeedData();
const newWork = fresh.works[0];

const otherWorks = current.works.filter((w) => w.title !== '九渊行');
const hasLibraryData = (current.library?.items?.length ?? 0) > 0
  || (current.library?.collections?.length ?? 0) > 0;
const merged: AppData = {
  ...current,
  works: [newWork, ...otherWorks],
  library: hasLibraryData ? current.library : fresh.library,
  preferences: {
    ...current.preferences,
    activeWorkId: newWork.id,
    activeChapterId: newWork.chapters[0].id,
  },
};

await writeFile(storagePath, JSON.stringify(merged, null, 2), 'utf8');

console.log('Reseeded 九渊行 with fresh content.');
console.log(' chapters:', newWork.chapters.length);
console.log(' lore    :', newWork.lore.length);
console.log(' ideas   :', newWork.ideas.length);
console.log(' foresh  :', newWork.foreshadows.length);
console.log(' relations:', newWork.relations.length);
if (!hasLibraryData) {
  console.log(' library :', merged.library?.items.length ?? 0, 'items,',
    merged.library?.collections.length ?? 0, 'collections (seeded fresh)');
} else {
  console.log(' library : preserved existing data');
}
console.log('Backup saved to:', storagePath + '.bak');
