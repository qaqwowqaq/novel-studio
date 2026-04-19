import type { Anchor, Chapter } from './types';

const CONTEXT_CHARS = 30;
const EXCERPT_MAX = 80;

export function buildAnchorFromSelection(
  chapterId: string,
  selectionStart: number,
  selectionEnd: number,
  content: string,
): Anchor {
  const safeStart = Math.max(0, Math.min(selectionStart, content.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, content.length));
  const rawExcerpt = content.slice(safeStart, safeEnd);
  const excerpt = rawExcerpt.length > EXCERPT_MAX
    ? `${rawExcerpt.slice(0, EXCERPT_MAX).trimEnd()}…`
    : rawExcerpt;
  const contextBefore = content.slice(Math.max(0, safeStart - CONTEXT_CHARS), safeStart);
  const contextAfter = content.slice(safeEnd, Math.min(content.length, safeEnd + CONTEXT_CHARS));

  return {
    chapterId,
    excerpt,
    contextBefore,
    contextAfter,
    createdAt: new Date().toISOString(),
  };
}

export interface AnchorMatch {
  start: number;
  end: number;
  score: number;
}

export function locateAnchorInChapter(anchor: Anchor, chapter: Chapter): AnchorMatch | null {
  if (!anchor.excerpt) return null;
  const content = chapter.content;
  const exact = content.indexOf(anchor.excerpt);
  if (exact >= 0) {
    return { start: exact, end: exact + anchor.excerpt.length, score: 1 };
  }

  const needle = anchor.contextBefore + anchor.excerpt + anchor.contextAfter;
  if (needle.length > 0) {
    const loose = content.indexOf(needle);
    if (loose >= 0) {
      const off = loose + anchor.contextBefore.length;
      return { start: off, end: off + anchor.excerpt.length, score: 0.9 };
    }
  }

  const normalized = anchor.excerpt.replace(/\s+/g, '').trim();
  if (normalized.length >= 4) {
    const stripped = content.replace(/\s+/g, '');
    const idx = stripped.indexOf(normalized);
    if (idx >= 0) {
      let mapped = 0;
      let consumed = 0;
      for (let i = 0; i < content.length && consumed < idx; i++) {
        if (!/\s/.test(content[i])) consumed++;
        mapped = i + 1;
      }
      return { start: mapped, end: mapped + anchor.excerpt.length, score: 0.7 };
    }
  }

  return null;
}

export function previewAnchor(anchor: Anchor): string {
  return anchor.excerpt.replace(/\s+/g, ' ').trim();
}
