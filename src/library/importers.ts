import type { AssetRecord, LibraryItem, LibraryItemKind } from '../types';
import { compressImageFile } from '../assets';
import { deriveTitle, detectKindFromBody, htmlToMarkdown, parseMarkdown } from './parse';

const IMAGE_MAX_EDGE = 1400;

export interface ImportedEntry {
  item: LibraryItem;
  newAsset?: AssetRecord;
  warning?: string;
}

export interface ImportContext {
  collectionId: string;
  collectionNames: Map<string, string>;
}

function now() {
  return new Date().toISOString();
}

function baseItem(
  collectionId: string,
  kind: LibraryItemKind,
  fields: Partial<Pick<LibraryItem, 'title' | 'body' | 'tags' | 'source' | 'imageAssetId'>>,
): LibraryItem {
  const stamp = now();
  return {
    id: crypto.randomUUID(),
    collectionId,
    kind,
    title: fields.title?.trim() || '未命名素材',
    body: fields.body ?? '',
    tags: fields.tags ?? [],
    source: fields.source,
    imageAssetId: fields.imageAssetId,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function resolveCollectionId(ctx: ImportContext, requested?: string): string {
  if (!requested) return ctx.collectionId;
  for (const [id, name] of ctx.collectionNames) {
    if (name === requested) return id;
  }
  return ctx.collectionId;
}

export async function importImageFile(file: File, ctx: ImportContext): Promise<ImportedEntry> {
  const asset = await compressImageFile(file, { maxEdge: IMAGE_MAX_EDGE });
  const baseName = stripExtension(file.name);
  const item = baseItem(ctx.collectionId, '图像参考', {
    title: baseName || '图像参考',
    body: `![${baseName || '图片'}](asset:${asset.id})\n`,
    tags: [],
  });
  return { item, newAsset: asset };
}

export async function importMarkdownFile(file: File, ctx: ImportContext): Promise<ImportedEntry> {
  const text = await file.text();
  const fallbackTitle = stripExtension(file.name);
  const parsed = parseMarkdown(text, fallbackTitle);
  const kind = parsed.kind ?? detectKindFromBody(parsed.body);
  const collectionId = resolveCollectionId(ctx, parsed.collection);
  const item = baseItem(collectionId, kind, {
    title: parsed.title ?? fallbackTitle,
    body: parsed.body,
    tags: parsed.tags,
    source: parsed.source ?? file.name,
  });
  return { item };
}

export async function importPlainTextFile(file: File, ctx: ImportContext): Promise<ImportedEntry> {
  const text = await file.text();
  const fallbackTitle = stripExtension(file.name);
  const kind = detectKindFromBody(text);
  const item = baseItem(ctx.collectionId, kind, {
    title: deriveTitle(text, fallbackTitle),
    body: text,
    tags: [],
    source: file.name,
  });
  return { item };
}

export function importHtmlString(html: string, ctx: ImportContext, source?: string): ImportedEntry {
  const md = htmlToMarkdown(html);
  const kind = detectKindFromBody(md);
  const item = baseItem(ctx.collectionId, kind, {
    title: deriveTitle(md, '粘贴内容'),
    body: md,
    tags: [],
    source,
  });
  return { item };
}

export function importPlainTextString(text: string, ctx: ImportContext, source?: string): ImportedEntry {
  const parsed = parseMarkdown(text);
  const kind = parsed.kind ?? detectKindFromBody(parsed.body || text);
  const collectionId = resolveCollectionId(ctx, parsed.collection);
  const item = baseItem(collectionId, kind, {
    title: parsed.title ?? deriveTitle(parsed.body || text, '粘贴内容'),
    body: parsed.body || text,
    tags: parsed.tags,
    source: parsed.source ?? source,
  });
  return { item };
}

export async function importImageBlob(blob: Blob, ctx: ImportContext, filename = '粘贴图片'): Promise<ImportedEntry> {
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  return importImageFile(file, ctx);
}

export function classifyFile(file: File): 'image' | 'markdown' | 'text' | 'unsupported' {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.mdx')) return 'markdown';
  if (file.type.startsWith('text/') || name.endsWith('.txt')) return 'text';
  return 'unsupported';
}

export async function importFile(file: File, ctx: ImportContext): Promise<ImportedEntry> {
  const kind = classifyFile(file);
  if (kind === 'image') return importImageFile(file, ctx);
  if (kind === 'markdown') return importMarkdownFile(file, ctx);
  if (kind === 'text') return importPlainTextFile(file, ctx);
  throw new Error(`不支持的文件类型：${file.name}`);
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}
