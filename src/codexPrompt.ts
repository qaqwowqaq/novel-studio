import type { AiMessage, Chapter, Work } from './types';

const MAX_HISTORY_MESSAGES = 6;
const MAX_CHAPTER_CHARS = 5000;
const MAX_LORE_ITEMS = 10;
const MAX_IDEA_ITEMS = 6;

function clampText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }

  const tail = text.slice(-maxChars);
  return `（以下为章节结尾附近节选，已截断）\n${tail}`;
}

function formatLore(work: Work) {
  if (work.lore.length === 0) {
    return '暂无设定';
  }

  return work.lore
    .slice(0, MAX_LORE_ITEMS)
    .map((item) => `- [${item.type}] ${item.name}：${item.description}`)
    .join('\n');
}

function formatIdeas(work: Work) {
  if (work.ideas.length === 0) {
    return '暂无灵感';
  }

  return work.ideas
    .slice(0, MAX_IDEA_ITEMS)
    .map((item) => `- ${item.content}`)
    .join('\n');
}

function formatHistory(messages: AiMessage[]) {
  if (messages.length === 0) {
    return '暂无历史对话';
  }

  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => `${msg.role === 'user' ? '用户' : '助手'}：${msg.content}`)
    .join('\n\n');
}

const PROTOCOL_INSTRUCTIONS = `
==== 输出协议 ====
请先用自然语言回复作者。

如果你的回复包含对作品的具体修改建议，请在正文之后补一个 JSON 代码块（仅当确实有修改建议时输出）：

\`\`\`json
{
  "proposals": [
    { "kind": "add_idea", "content": "一句灵感文字" },
    { "kind": "add_lore", "type": "人物|地点|势力|规则|线索", "name": "名字", "description": "描述" },
    { "kind": "append_to_chapter", "text": "要追加到当前章节末尾的正文（可多段）" },
    { "kind": "insert_at_cursor", "text": "在作者当前光标位置插入的正文", "cursorHint": "可选：描述此插入的意图" },
    { "kind": "replace_selection", "match": "章节内必须精确存在的原文", "text": "替换后的新文字" },
    { "kind": "update_outline", "outline": "新的大纲全文" },
    { "kind": "update_summary", "summary": "新的本章摘要" }
  ]
}
\`\`\`

规则：
- 每条建议作者都会单独审批，所以只给必要的、已经想清楚的建议；不要堆砌。
- 润色/扩写一段文字优先用 replace_selection，match 字段必须是章节里一字不差的原文。
- 如果你只是在讨论、解释、反问，不要输出 proposals 块。
- 不要在回复里解释"我将输出 JSON"之类的元描述。
==== 结束协议 ====
`;

export function buildCodexWritingPrompt(params: {
  request: string;
  work: Work;
  chapter: Chapter;
  messages: AiMessage[];
  selection?: string | null;
  permissionModeNote?: string;
}) {
  const { request, work, chapter, messages, selection } = params;

  return [
    '你是一名长篇小说写作助手，请始终用简体中文回答。',
    '你的重点是帮助作者推进创作，不要讨论 CLI、终端、代码实现或插件系统。',
    '除非用户明确要求，否则优先给出可直接用于写作的内容、改写、扩写、结构建议或人物/情节分析。',
    '如果用户是在要你润色或扩写，请直接给结果，必要时再附一小段说明。',
    PROTOCOL_INSTRUCTIONS,
    '',
    `作品：${work.title}`,
    `类型：${work.genre}`,
    `简介：${work.synopsis}`,
    '',
    `当前章节：${chapter.title}`,
    `章节摘要：${chapter.summary || '暂无摘要'}`,
    `章节大纲：${chapter.outline || '暂无大纲'}`,
    '',
    '核心设定：',
    formatLore(work),
    '',
    '近期灵感：',
    formatIdeas(work),
    '',
    '当前章节正文节选：',
    clampText(chapter.content || '暂无正文', MAX_CHAPTER_CHARS),
    '',
    selection ? `作者当前选中的正文片段：\n「${selection}」\n` : '',
    '最近对话：',
    formatHistory(messages),
    '',
    '本次用户请求：',
    request,
  ].filter(Boolean).join('\n');
}
