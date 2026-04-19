import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import extract from 'extract-zip';

async function findFileRecursive(dir, target) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name === target) {
      return fullPath;
    }

    if (entry.isDirectory()) {
      const nested = await findFileRecursive(fullPath, target);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

async function main() {
  const electronRoot = path.resolve('node_modules/electron');
  const packageJson = JSON.parse(await readFile(path.join(electronRoot, 'package.json'), 'utf8'));
  const version = packageJson.version;
  const cacheRoot = path.join(process.env.LOCALAPPDATA ?? '', 'electron', 'Cache');
  const zipName = `electron-v${version}-win32-x64.zip`;

  const zipPath = await findFileRecursive(cacheRoot, zipName);

  if (!zipPath) {
    throw new Error(`未找到 Electron 缓存包: ${zipName}`);
  }

  const distDir = path.join(electronRoot, 'dist');
  await rm(distDir, { recursive: true, force: true });
  await extract(zipPath, { dir: distDir });
  await writeFile(path.join(electronRoot, 'path.txt'), 'electron.exe', 'utf8');

  console.log(`Electron repaired from cache: ${zipPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
