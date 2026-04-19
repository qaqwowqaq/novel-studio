import type { ChapterStatus, Work, WorkStatus } from './types';

export function countChars(text: string) {
  return text.replace(/\s/g, '').length;
}

export function formatDateTime(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getStatusLabel(status: WorkStatus | ChapterStatus) {
  const mapping: Record<string, string> = {
    drafting: '草稿中',
    serializing: '连载中',
    paused: '暂停',
    draft: '草稿',
    revising: '修改中',
    queued: '待发布',
  };
  return mapping[status] ?? status;
}

export function summarizeProgress(work: Work) {
  const wordCount = work.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const volumeCount = work.volumes?.length ?? 0;
  const prefix = volumeCount > 0 ? `${volumeCount} 卷 · ` : '';
  return `${prefix}${work.chapters.length} 章 · ${wordCount.toLocaleString()} 字`;
}

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function toCnNumber(n: number): string {
  if (n <= 0) return '零';
  if (n < 10) return CN_DIGITS[n];
  if (n === 10) return '十';
  if (n < 20) return `十${CN_DIGITS[n - 10]}`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${CN_DIGITS[tens]}十${ones === 0 ? '' : CN_DIGITS[ones]}`;
  }
  return String(n);
}

export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function exportToText(work: Work): string {
  const header = `${work.title}\n${'='.repeat(work.title.length * 2)}\n\n`;
  const body = work.chapters
    .map((ch) => `${ch.title}\n\n${ch.content}`)
    .join('\n\n---\n\n');
  return header + body;
}

export function exportToMarkdown(work: Work): string {
  let md = `# ${work.title}\n\n> ${work.synopsis}\n\n`;
  for (const ch of work.chapters) {
    md += `## ${ch.title}\n\n${ch.content}\n\n`;
  }
  return md;
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
