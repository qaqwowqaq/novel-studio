import type { LibraryItemKind } from '../types';

const KIND_VALUES: readonly LibraryItemKind[] = [
  '描写片段',
  '知识参考',
  '设定素材',
  '灵感种子',
  '图像参考',
];

export interface ParsedMarkdown {
  title?: string;
  tags: string[];
  kind?: LibraryItemKind;
  source?: string;
  collection?: string;
  body: string;
}

export function parseMarkdown(raw: string, fallbackTitle?: string): ParsedMarkdown {
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  let body = raw;
  let fm: Record<string, unknown> = {};
  if (fmMatch) {
    fm = parseFrontmatter(fmMatch[1]);
    body = raw.slice(fmMatch[0].length);
  }

  const title = pickString(fm.title)
    ?? fallbackTitle
    ?? extractFirstHeading(body)
    ?? undefined;
  const tags = toStringArray(fm.tags);
  const kindRaw = pickString(fm.kind);
  const kind = isKind(kindRaw) ? kindRaw : undefined;
  const source = pickString(fm.source);
  const collection = pickString(fm.collection);

  return {
    title,
    tags,
    kind,
    source,
    collection,
    body: body.replace(/^\s+/, ''),
  };
}

function pickString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter((x) => x.length > 0);
  }
  if (typeof v === 'string') {
    return v.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function isKind(v: string | undefined): v is LibraryItemKind {
  return typeof v === 'string' && (KIND_VALUES as readonly string[]).includes(v);
}

function extractFirstHeading(body: string): string | undefined {
  const match = /^#{1,6}\s+(.+?)\s*$/m.exec(body);
  return match ? match[1].trim() : undefined;
}

function parseFrontmatter(text: string): Record<string, unknown> {
  const lines = text.split(/\r?\n/);
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  const flushList = () => {
    if (currentKey && currentList) {
      result[currentKey] = currentList;
    }
    currentKey = null;
    currentList = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) continue;

    const listMatch = /^\s*-\s+(.*)$/.exec(line);
    if (listMatch && currentList) {
      currentList.push(unquote(listMatch[1].trim()));
      continue;
    }

    const kvMatch = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kvMatch) continue;
    flushList();

    const key = kvMatch[1];
    const rawVal = kvMatch[2].trim();
    if (rawVal === '') {
      currentKey = key;
      currentList = [];
      continue;
    }
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const inner = rawVal.slice(1, -1);
      result[key] = inner
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
      continue;
    }
    result[key] = unquote(rawVal);
  }
  flushList();
  return result;
}

function unquote(s: string): string {
  if (s.length >= 2) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
  }
  return s;
}

export function detectKindFromBody(body: string): LibraryItemKind {
  const headingHits = /^##\s+(规则|机制|限制|代价|特征|设定|属性)/m.test(body);
  if (headingHits) return '设定素材';
  const trimmed = body.trim();
  if (trimmed.length <= 260 && !/^#/m.test(trimmed)) return '描写片段';
  return '知识参考';
}

export function deriveTitle(body: string, fallback: string): string {
  const heading = extractFirstHeading(body);
  if (heading) return heading;
  const firstLine = body.trim().split(/\r?\n/)[0] ?? '';
  const clean = firstLine.replace(/^#+\s*/, '').trim();
  if (clean.length > 0) {
    return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
  }
  return fallback;
}

export function htmlToMarkdown(html: string): string {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
  stripNoise(doc.body);
  const md = nodeToMd(doc.body);
  return collapseBlankLines(md).trim();
}

function stripNoise(root: HTMLElement) {
  root.querySelectorAll('script, style, noscript, iframe, svg, button, nav, aside, form').forEach((el) => el.remove());
  root.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
}

function collapseBlankLines(s: string): string {
  return s.replace(/\n{3,}/g, '\n\n');
}

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/[\t ]+/g, ' ').replace(/\u00a0/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const kids = () => Array.from(el.childNodes).map(nodeToMd).join('');

  switch (tag) {
    case 'h1': return `\n\n# ${kids().trim()}\n\n`;
    case 'h2': return `\n\n## ${kids().trim()}\n\n`;
    case 'h3': return `\n\n### ${kids().trim()}\n\n`;
    case 'h4': return `\n\n#### ${kids().trim()}\n\n`;
    case 'h5': return `\n\n##### ${kids().trim()}\n\n`;
    case 'h6': return `\n\n###### ${kids().trim()}\n\n`;
    case 'p': return `\n\n${kids().trim()}\n\n`;
    case 'strong':
    case 'b': {
      const inner = kids().trim();
      return inner ? `**${inner}**` : '';
    }
    case 'em':
    case 'i': {
      const inner = kids().trim();
      return inner ? `*${inner}*` : '';
    }
    case 'code': return `\`${el.textContent ?? ''}\``;
    case 'pre': {
      const codeEl = el.querySelector('code');
      const text = (codeEl ?? el).textContent ?? '';
      return `\n\n\`\`\`\n${text.replace(/\n+$/, '')}\n\`\`\`\n\n`;
    }
    case 'blockquote': {
      const inner = kids().trim();
      const quoted = inner.split('\n').map((l) => `> ${l}`).join('\n');
      return `\n\n${quoted}\n\n`;
    }
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      const text = kids().trim();
      if (!text) return '';
      return href ? `[${text}](${href})` : text;
    }
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return src ? `![${alt}](${src})` : '';
    }
    case 'br': return '  \n';
    case 'hr': return '\n\n---\n\n';
    case 'ul':
    case 'ol': {
      const items = Array.from(el.children).filter((c) => c.tagName === 'LI');
      const ordered = tag === 'ol';
      const lines = items.map((li, i) => {
        const text = nodeToMd(li).trim().replace(/\n/g, ' ');
        return ordered ? `${i + 1}. ${text}` : `- ${text}`;
      });
      return `\n\n${lines.join('\n')}\n\n`;
    }
    case 'li': return kids();
    case 'table': {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) return '';
      const toCells = (tr: Element) =>
        Array.from(tr.querySelectorAll('th,td')).map((c) => nodeToMd(c).trim().replace(/\|/g, '\\|'));
      const header = toCells(rows[0]);
      const rest = rows.slice(1).map(toCells);
      const head = `| ${header.join(' | ')} |`;
      const sep = `| ${header.map(() => '---').join(' | ')} |`;
      const body = rest.map((cells) => `| ${cells.join(' | ')} |`).join('\n');
      return `\n\n${head}\n${sep}\n${body}\n\n`;
    }
    default: return kids();
  }
}
