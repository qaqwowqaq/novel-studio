import type { Chapter, Volume, Work, WorkCover } from './types';

export type ImportEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030';

export interface ImportChapterPreview {
  title: string;
  content: string;
  wordCount: number;
  volumeIndex: number | null;
}

export interface ImportVolumePreview {
  title: string;
  chapterCount: number;
}

export interface ImportedBookPreview {
  title: string;
  author: string;
  synopsis: string;
  encoding: ImportEncoding;
  volumes: ImportVolumePreview[];
  chapters: ImportChapterPreview[];
  rawLength: number;
  warnings: string[];
}

const BOM_UTF8 = [0xef, 0xbb, 0xbf];
const BOM_UTF16LE = [0xff, 0xfe];
const BOM_UTF16BE = [0xfe, 0xff];

function matchPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

function detectEncoding(bytes: Uint8Array): ImportEncoding {
  if (matchPrefix(bytes, BOM_UTF8)) return 'utf-8';
  if (matchPrefix(bytes, BOM_UTF16LE)) return 'utf-16le';
  if (matchPrefix(bytes, BOM_UTF16BE)) return 'utf-16be';
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, Math.min(bytes.length, 64 * 1024)));
    return 'utf-8';
  } catch {
    return 'gb18030';
  }
}

export function decodeBuffer(buffer: ArrayBuffer, forced?: ImportEncoding): { text: string; encoding: ImportEncoding } {
  const bytes = new Uint8Array(buffer);
  const encoding = forced ?? detectEncoding(bytes);
  const decoder = new TextDecoder(encoding, { fatal: false });
  let text = decoder.decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return { text, encoding };
}

function countChineseChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

const CN_NUM_CHARS = '一二三四五六七八九十百千万零〇两';
const VOLUME_RE = new RegExp(
  `^[\\s\\u3000]*(?:第\\s*([${CN_NUM_CHARS}\\d]+)\\s*[卷部篇]|[卷部篇]\\s*([${CN_NUM_CHARS}\\d]+))(?:\\s*[·:：、.．\\-—]?\\s*(.*))?\\s*$`,
);
const CHAPTER_RE = new RegExp(`^[\\s\\u3000]*第\\s*([${CN_NUM_CHARS}\\d]+)\\s*[章回节集]\\s*(?:[·:：、.．\\-—]?\\s*)?(.*)$`);
const PROLOGUE_RE = /^[\s\u3000]*(楔\s*子|引\s*子|序\s*章|序\s*言|前\s*言|尾\s*声|后\s*记|番\s*外(?:\s*篇)?)[\s·:：、.．\-—]?\s*(.*)$/;
const CHAPTER_EN_RE = /^[\s\u3000]*Chapter\s+([IVXLCDM\d]+)\s*[:.\-—]?\s*(.*)$/i;

// Filters for ad lines in Chinese web-novel dumps (zxcs/zlib/txt epub extractors).
const AD_LINE_RE = /(^=+\s*$)|(^-{5,}\s*$)|(https?:\/\/)|(www\.)|(精校小说)|(zxcs)|(z-library)|(z-lib)|(1lib)|(请认准)|(www、)|(\.me\/)|(\.com\/)|(\.org\/)|(\.net\/)/i;

const AUTHOR_RE = /^[\s\u3000]*(?:作者|著者|作家|Author)[\s:：]+(.+?)\s*$/i;
const TITLE_HINT_RE = /^[\s\u3000]*(?:书名|书\s*名|title)[\s:：]+(.+?)\s*$/i;
const SYNOPSIS_LABEL_RE = /^[\s\u3000]*(?:内容简介|简介|作品简介|故事简介|Synopsis|Description)\s*[:：]?\s*(.*)$/i;

function normalizeLines(raw: string): string[] {
  return raw.replace(/\r\n?/g, '\n').split('\n');
}

function isAdLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return AD_LINE_RE.test(t);
}

interface MarkerMatch {
  kind: 'volume' | 'chapter';
  index: number;
  rawTitle: string;
  autoIndex?: string;
}

function detectMarker(line: string): MarkerMatch | null {
  const t = line.trim();
  if (!t) return null;
  const vol = VOLUME_RE.exec(t);
  if (vol) return { kind: 'volume', index: 0, rawTitle: t, autoIndex: vol[1] ?? vol[2] };
  const ch = CHAPTER_RE.exec(t);
  if (ch) return { kind: 'chapter', index: 0, rawTitle: t, autoIndex: ch[1] };
  const pro = PROLOGUE_RE.exec(t);
  if (pro) return { kind: 'chapter', index: 0, rawTitle: t };
  const en = CHAPTER_EN_RE.exec(t);
  if (en) return { kind: 'chapter', index: 0, rawTitle: t, autoIndex: en[1] };
  return null;
}

function stripNoise(content: string): string {
  const paragraphs: string[] = [];
  for (const raw of content.split('\n')) {
    if (isAdLine(raw)) continue;
    // Strip leading full-width spaces (U+3000) and regular whitespace; trim tail.
    const trimmed = raw.replace(/^[\s\u3000]+/, '').replace(/\s+$/, '');
    if (!trimmed) continue;
    paragraphs.push(trimmed);
  }
  return paragraphs.join('\n\n');
}

interface HeaderInfo {
  title: string;
  author: string;
  synopsis: string;
  firstBodyLine: number;
}

function extractHeader(lines: string[], firstMarkerLine: number, fallbackTitle: string): HeaderInfo {
  const headerLines = lines.slice(0, firstMarkerLine);
  let title = '';
  let author = '';
  const synopsisLines: string[] = [];
  let inSynopsis = false;

  for (let i = 0; i < headerLines.length; i++) {
    const raw = headerLines[i];
    const line = raw.trim();
    if (!line) {
      if (inSynopsis) synopsisLines.push('');
      continue;
    }
    if (isAdLine(line)) continue;

    const synLabel = SYNOPSIS_LABEL_RE.exec(line);
    if (synLabel) {
      inSynopsis = true;
      if (synLabel[1]) synopsisLines.push(synLabel[1]);
      continue;
    }
    const authorMatch = AUTHOR_RE.exec(line);
    if (authorMatch) {
      author = authorMatch[1].trim();
      inSynopsis = false;
      continue;
    }
    const titleHint = TITLE_HINT_RE.exec(line);
    if (titleHint) {
      title = titleHint[1].trim();
      continue;
    }
    if (inSynopsis) {
      synopsisLines.push(line);
      continue;
    }
    // No label yet: the last non-noise line before 作者 / 简介 is usually the title.
    if (!title) title = line;
  }

  const synopsis = synopsisLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    title: title || fallbackTitle,
    author,
    synopsis,
    firstBodyLine: firstMarkerLine,
  };
}

export function parseNovelText(text: string, fallbackTitle: string): Omit<ImportedBookPreview, 'encoding' | 'rawLength'> {
  const warnings: string[] = [];
  const lines = normalizeLines(text);

  const markers: (MarkerMatch & { line: number })[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = detectMarker(lines[i]);
    if (m) markers.push({ ...m, line: i });
  }

  if (markers.length === 0) {
    const content = stripNoise(text);
    return {
      title: fallbackTitle,
      author: '',
      synopsis: '',
      volumes: [],
      chapters: [{
        title: fallbackTitle || '正文',
        content,
        wordCount: countChineseChars(content),
        volumeIndex: null,
      }],
      warnings: ['未识别出章节标记，已作为整篇正文导入。'],
    };
  }

  const firstMarkerLine = markers[0].line;
  const header = extractHeader(lines, firstMarkerLine, fallbackTitle);

  const volumes: ImportVolumePreview[] = [];
  const chapters: ImportChapterPreview[] = [];
  let currentVolumeIndex: number | null = null;

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const nextLine = i + 1 < markers.length ? markers[i + 1].line : lines.length;

    if (m.kind === 'volume') {
      volumes.push({ title: m.rawTitle, chapterCount: 0 });
      currentVolumeIndex = volumes.length - 1;
      // Skip volume heading itself; nothing else to push.
      continue;
    }

    const bodyLines = lines.slice(m.line + 1, nextLine);
    const content = stripNoise(bodyLines.join('\n'));
    const wordCount = countChineseChars(content);
    chapters.push({
      title: m.rawTitle,
      content,
      wordCount,
      volumeIndex: currentVolumeIndex,
    });
    if (currentVolumeIndex !== null) {
      volumes[currentVolumeIndex].chapterCount += 1;
    }
  }

  if (volumes.length > 0 && chapters.some((c) => c.volumeIndex === null)) {
    warnings.push('部分章节出现在卷标记之前，将归入 "未分卷"。');
  }

  return {
    title: header.title,
    author: header.author,
    synopsis: header.synopsis,
    volumes,
    chapters,
    warnings,
  };
}

export async function parseNovelFile(file: File, forcedEncoding?: ImportEncoding): Promise<ImportedBookPreview> {
  const buffer = await file.arrayBuffer();
  const { text, encoding } = decodeBuffer(buffer, forcedEncoding);
  const fallbackTitle = file.name.replace(/\.[^.]+$/, '').trim() || '导入作品';
  const parsed = parseNovelText(text, fallbackTitle);
  return {
    ...parsed,
    encoding,
    rawLength: text.length,
  };
}

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

export function buildWorkFromPreview(preview: ImportedBookPreview, overrides?: { title?: string; synopsis?: string }): Work {
  const now = new Date().toISOString();
  const title = (overrides?.title ?? preview.title).trim() || '导入作品';
  const synopsisParts: string[] = [];
  const baseSynopsis = (overrides?.synopsis ?? preview.synopsis).trim();
  if (baseSynopsis) synopsisParts.push(baseSynopsis);
  if (preview.author) synopsisParts.push(`作者：${preview.author}`);
  const synopsis = synopsisParts.join('\n\n');

  const volumeRecords: Volume[] = preview.volumes.map((v) => ({
    id: crypto.randomUUID(),
    title: v.title,
    createdAt: now,
    updatedAt: now,
  }));

  const chapterRecords: Chapter[] = preview.chapters.map((c) => ({
    id: crypto.randomUUID(),
    title: c.title,
    summary: '',
    outline: '',
    content: c.content,
    status: 'draft',
    linkedLoreIds: [],
    wordCount: c.wordCount,
    updatedAt: now,
    volumeId: c.volumeIndex !== null ? volumeRecords[c.volumeIndex]?.id : undefined,
  }));

  if (chapterRecords.length === 0) {
    chapterRecords.push({
      id: crypto.randomUUID(),
      title: '第1章 新章起笔',
      summary: '',
      outline: '',
      content: '',
      status: 'draft',
      linkedLoreIds: [],
      wordCount: 0,
      updatedAt: now,
    });
  }

  const cover: WorkCover = { color: pickCoverColor(title) };

  return {
    id: crypto.randomUUID(),
    title,
    genre: '',
    status: 'drafting',
    synopsis,
    updatedAt: now,
    createdAt: now,
    cover,
    chapters: chapterRecords,
    volumes: volumeRecords,
    lore: [],
    ideas: [],
    relations: [],
    aiMessages: [],
    foreshadows: [],
  };
}
