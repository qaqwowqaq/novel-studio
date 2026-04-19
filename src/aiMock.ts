import type { Chapter, Work } from './types';

export function mockReply(message: string, chapter: Chapter, work: Work): string {
  const q = message.toLowerCase();
  if (q.includes('续写') || q.includes('接下来')) {
    return `基于"${chapter.title}"的当前进展，你可以考虑：\n\n1. 用一个意外事件打破当前僵局\n2. 让一个次要角色揭示隐藏信息\n3. 通过环境描写暗示即将到来的危机\n\n试试从角色的内心独白切入，展开下一个场景。`;
  }
  if (q.includes('人物') || q.includes('角色')) {
    const chars = work.lore.filter((l) => l.type === '人物');
    if (chars.length === 0) return '当前作品还没有录入人物设定。先去设定库添加角色吧。';
    return `当前作品有 ${chars.length} 个角色：\n\n${chars.map((c) => `**${c.name}**：${c.description}`).join('\n\n')}\n\n你想深入发展哪个角色的故事线？`;
  }
  if (q.includes('大纲') || q.includes('结构')) {
    return `"${chapter.title}"的大纲：\n\n${chapter.outline || '（暂无大纲，建议先在大纲面板中规划本章结构）'}\n\n建议每章围绕一个核心冲突展开，结尾留钩子。`;
  }
  if (q.includes('卡') || q.includes('写不下去') || q.includes('没灵感')) {
    return '写不下去的时候，试试这几个方法：\n\n1. **跳过当前段落**，先写后面你想写的场景\n2. **换个视角**重写这个段落\n3. **降低标准**，先写烂稿再改\n4. 去灵感箱翻翻之前记下的碎片\n\n哪个方向适合你现在的状态？';
  }
  return `关于"${message.slice(0, 20)}"，这是我的想法：\n\n当前章节"${chapter.title}"有 ${chapter.wordCount} 字。你可以问我：\n- "帮我续写" — 获取写作方向建议\n- "分析人物" — 梳理角色关系\n- "我卡文了" — 获取突破瓶颈的方法\n- "看看大纲" — 回顾章节结构`;
}
