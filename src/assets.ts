import type { AppData, AssetRecord } from './types';

export interface PickImageOptions {
  maxEdge: number;
  quality?: number;
  preferPng?: boolean;
}

export interface PickedAsset {
  record: AssetRecord;
}

const DEFAULT_QUALITY = 0.85;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败'));
    img.src = dataUrl;
  });
}

function estimateBytesFromDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

export async function compressImageFile(file: File, options: PickImageOptions): Promise<AssetRecord> {
  const { maxEdge, quality = DEFAULT_QUALITY, preferPng = false } = options;
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const longest = Math.max(img.width, img.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const targetW = Math.round(img.width * scale);
  const targetH = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp' || preferPng;
  const mime = hasAlpha ? 'image/png' : 'image/jpeg';
  const dataUrl = hasAlpha
    ? canvas.toDataURL(mime)
    : canvas.toDataURL(mime, quality);

  return {
    id: crypto.randomUUID(),
    kind: 'image',
    mime,
    dataUrl,
    width: targetW,
    height: targetH,
    bytes: estimateBytesFromDataUrl(dataUrl),
    createdAt: new Date().toISOString(),
    label: file.name,
  };
}

export function pickImageFile(accept = 'image/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      resolve(file);
    };
    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };
    input.click();
  });
}

export async function pickImageAsset(options: PickImageOptions): Promise<AssetRecord | null> {
  const file = await pickImageFile();
  if (!file) return null;
  return compressImageFile(file, options);
}

export function upsertAsset(data: AppData, asset: AssetRecord): AppData {
  const assets = data.assets ?? [];
  const idx = assets.findIndex((a) => a.id === asset.id);
  const next = [...assets];
  if (idx >= 0) next[idx] = asset;
  else next.unshift(asset);
  return { ...data, assets: next };
}

export function getAsset(data: AppData | null, id: string | undefined): AssetRecord | undefined {
  if (!data || !id) return undefined;
  return (data.assets ?? []).find((a) => a.id === id);
}

const ASSET_REF_RE = /\basset:([a-zA-Z0-9-]+)/g;

function collectBodyAssetRefs(body: string, out: Set<string>) {
  for (const m of body.matchAll(ASSET_REF_RE)) out.add(m[1]);
}

export function isAssetReferenced(data: AppData, id: string): boolean {
  for (const w of data.works) {
    if (w.cover?.imageAssetId === id) return true;
    for (const l of w.lore) if (l.imageAssetId === id) return true;
  }
  const needle = `asset:${id}`;
  for (const item of data.library?.items ?? []) {
    if (item.imageAssetId === id) return true;
    if (item.body.includes(needle)) return true;
  }
  return false;
}

export function collectGarbageAssets(data: AppData): AppData {
  const referenced = new Set<string>();
  for (const w of data.works) {
    if (w.cover?.imageAssetId) referenced.add(w.cover.imageAssetId);
    for (const l of w.lore) if (l.imageAssetId) referenced.add(l.imageAssetId);
  }
  for (const item of data.library?.items ?? []) {
    if (item.imageAssetId) referenced.add(item.imageAssetId);
    collectBodyAssetRefs(item.body, referenced);
  }
  const assets = (data.assets ?? []).filter((a) => referenced.has(a.id));
  return { ...data, assets };
}

export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
