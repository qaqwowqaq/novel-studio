import type { LoreType, Proposal, ProposalKind, ProposalPayload } from '../types';

const VALID_LORE_TYPES: LoreType[] = ['人物', '地点', '势力', '规则', '线索'];

export const LOW_RISK_KINDS: ProposalKind[] = [
  'add_lore',
  'add_idea',
  'update_outline',
  'update_summary',
  'append_to_chapter',
];

export const HIGH_RISK_KINDS: ProposalKind[] = [
  'insert_at_cursor',
  'replace_selection',
];

export function isLowRisk(kind: ProposalKind): boolean {
  return LOW_RISK_KINDS.includes(kind);
}

export interface ParsedAssistantReply {
  markdown: string;
  proposals: Proposal[];
  parseWarnings: string[];
}

function extractJsonBlocks(text: string): Array<{ block: string; start: number; end: number }> {
  const results: Array<{ block: string; start: number; end: number }> = [];
  const fenceRe = /```(?:json|JSON)?\s*\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text)) !== null) {
    results.push({ block: match[1], start: match.index, end: match.index + match[0].length });
  }
  return results;
}

function validatePayload(raw: unknown, warnings: string[]): ProposalPayload | null {
  if (!raw || typeof raw !== 'object') {
    warnings.push('proposal 不是对象');
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const kind = obj.kind;
  if (typeof kind !== 'string') {
    warnings.push('proposal 缺少 kind 字段');
    return null;
  }
  switch (kind) {
    case 'append_to_chapter': {
      if (typeof obj.text !== 'string' || !obj.text.trim()) {
        warnings.push(`${kind}: 缺少 text`);
        return null;
      }
      return { kind, text: obj.text };
    }
    case 'insert_at_cursor': {
      if (typeof obj.text !== 'string' || !obj.text.trim()) {
        warnings.push(`${kind}: 缺少 text`);
        return null;
      }
      return {
        kind,
        text: obj.text,
        cursorHint: typeof obj.cursorHint === 'string' ? obj.cursorHint : undefined,
      };
    }
    case 'replace_selection': {
      if (typeof obj.match !== 'string' || !obj.match.trim()) {
        warnings.push(`${kind}: 缺少 match`);
        return null;
      }
      if (typeof obj.text !== 'string') {
        warnings.push(`${kind}: 缺少 text`);
        return null;
      }
      return { kind, match: obj.match, text: obj.text };
    }
    case 'add_lore': {
      const loreType = obj.type;
      if (typeof loreType !== 'string' || !VALID_LORE_TYPES.includes(loreType as LoreType)) {
        warnings.push(`${kind}: type 必须是 ${VALID_LORE_TYPES.join('/')}`);
        return null;
      }
      if (typeof obj.name !== 'string' || !obj.name.trim()) {
        warnings.push(`${kind}: 缺少 name`);
        return null;
      }
      if (typeof obj.description !== 'string' || !obj.description.trim()) {
        warnings.push(`${kind}: 缺少 description`);
        return null;
      }
      return { kind, type: loreType as LoreType, name: obj.name, description: obj.description };
    }
    case 'add_idea': {
      if (typeof obj.content !== 'string' || !obj.content.trim()) {
        warnings.push(`${kind}: 缺少 content`);
        return null;
      }
      return { kind, content: obj.content };
    }
    case 'update_outline': {
      if (typeof obj.outline !== 'string') {
        warnings.push(`${kind}: 缺少 outline`);
        return null;
      }
      return { kind, outline: obj.outline };
    }
    case 'update_summary': {
      if (typeof obj.summary !== 'string') {
        warnings.push(`${kind}: 缺少 summary`);
        return null;
      }
      return { kind, summary: obj.summary };
    }
    default:
      warnings.push(`未知 kind: ${kind}`);
      return null;
  }
}

export function parseAssistantReply(raw: string): ParsedAssistantReply {
  const warnings: string[] = [];
  const blocks = extractJsonBlocks(raw);
  const proposals: Proposal[] = [];
  let strippedText = raw;

  for (const { block, start, end } of blocks) {
    try {
      const parsed = JSON.parse(block) as unknown;
      if (!parsed || typeof parsed !== 'object') continue;
      const root = parsed as Record<string, unknown>;
      const list = root.proposals;
      if (!Array.isArray(list)) continue;
      let anyValid = false;
      for (const item of list) {
        const payload = validatePayload(item, warnings);
        if (!payload) continue;
        proposals.push({
          id: crypto.randomUUID(),
          status: 'pending',
          payload,
        });
        anyValid = true;
      }
      if (anyValid) {
        // 把这段 JSON fence 从正文中剥离
        strippedText = strippedText.replace(raw.slice(start, end), '');
      }
    } catch {
      // 不是合法 JSON 块，忽略
    }
  }

  const markdown = strippedText.trim();
  return { markdown, proposals, parseWarnings: warnings };
}

export function describeProposal(p: Proposal): string {
  const payload = p.payload;
  switch (payload.kind) {
    case 'append_to_chapter':
      return '在当前章节末尾追加一段正文';
    case 'insert_at_cursor':
      return '在光标位置插入正文';
    case 'replace_selection':
      return '替换章节内一段指定文字';
    case 'add_lore':
      return `添加设定：[${payload.type}] ${payload.name}`;
    case 'add_idea':
      return '添加一条灵感';
    case 'update_outline':
      return '更新本章大纲';
    case 'update_summary':
      return '更新本章摘要';
  }
}

export function getProposalPreview(p: Proposal): { before?: string; after: string } {
  const payload = p.payload;
  switch (payload.kind) {
    case 'append_to_chapter':
    case 'insert_at_cursor':
      return { after: payload.text };
    case 'replace_selection':
      return { before: payload.match, after: payload.text };
    case 'add_lore':
      return { after: `${payload.name}\n${payload.description}` };
    case 'add_idea':
      return { after: payload.content };
    case 'update_outline':
      return { after: payload.outline };
    case 'update_summary':
      return { after: payload.summary };
  }
}
