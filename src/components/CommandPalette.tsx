import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChapterSnapshot, Library, PanelTab, Work } from '../types';
import { useActionUsage } from '../hooks/useActionUsage';

type ActionGroup = 'recent' | 'core' | 'export' | 'more';
type StaticGroup = 'chapter' | 'lore' | 'work' | 'material' | 'match';
type PaletteGroup = ActionGroup | StaticGroup;

interface PaletteItem {
  id: string;
  kind: 'action' | 'chapter' | 'lore' | 'work' | 'match' | 'material';
  group: PaletteGroup;
  label: string;
  hint: string;
  action: () => void;
}

type DrawerTarget = { drawer: 'chapters' | 'tools'; tab?: PanelTab };

interface CommandPaletteProps {
  works: Work[];
  activeWork: Work;
  activeChapterId: string;
  snapshots: ChapterSnapshot[];
  library: Library;
  rightDockOpen: boolean;
  initialQuery?: string;
  onSelectChapter: (id: string) => void;
  onSelectWork: (id: string) => void;
  onOpenDrawer: (target: DrawerTarget) => void;
  onOpenOverlay: (name: 'stats' | 'graph' | 'appearance' | 'ai-settings' | 'works' | 'library') => void;
  onExport: (format: 'txt' | 'md') => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshot: ChapterSnapshot) => void;
  onPinMaterial: (id: string) => void;
  onCloseRightDock: () => void;
  onClose: () => void;
}

const KIND_LABELS: Record<PaletteItem['kind'], string> = {
  action: '操作',
  chapter: '章节',
  lore: '设定',
  work: '作品',
  match: '正文',
  material: '素材',
};

const GROUP_LABELS: Record<PaletteGroup, string> = {
  recent: '最近使用',
  core: '作品与章节',
  export: '导出',
  more: '更多',
  chapter: '章节',
  lore: '设定',
  work: '作品',
  material: '素材',
  match: '正文匹配',
};

interface ActionDef {
  id: string;
  label: string;
  hint: string;
  group: ActionGroup;
  action: () => void;
}

export function CommandPalette({
  works,
  activeWork,
  activeChapterId,
  snapshots,
  library,
  rightDockOpen,
  initialQuery = '',
  onSelectChapter,
  onSelectWork,
  onOpenDrawer,
  onOpenOverlay,
  onExport,
  onCreateSnapshot,
  onRestoreSnapshot,
  onPinMaterial,
  onCloseRightDock,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { record, topIds } = useActionUsage();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const actionDefs = useMemo((): ActionDef[] => {
    const list: ActionDef[] = [
      { id: 'act-library', group: 'core', label: '打开作品库', hint: '⌘⇧O · 管理所有作品', action: () => onOpenOverlay('works') },
      { id: 'act-material-library', group: 'core', label: '打开素材库', hint: '管理所有素材', action: () => onOpenOverlay('library') },
      { id: 'act-chapters', group: 'core', label: '打开章节目录', hint: 'Ctrl+/', action: () => onOpenDrawer({ drawer: 'chapters' }) },
      { id: 'act-outline', group: 'core', label: '打开大纲', hint: 'Ctrl+.', action: () => onOpenDrawer({ drawer: 'tools', tab: 'outline' }) },
      { id: 'act-graph', group: 'core', label: '查看关系图谱', hint: '', action: () => onOpenOverlay('graph') },
      { id: 'act-stats', group: 'core', label: '查看写作统计', hint: '', action: () => onOpenOverlay('stats') },
      { id: 'act-snapshot', group: 'core', label: '创建当前章节快照', hint: '', action: onCreateSnapshot },
      { id: 'act-export-txt', group: 'export', label: '导出为纯文本', hint: '.txt', action: () => onExport('txt') },
      { id: 'act-export-md', group: 'export', label: '导出为 Markdown', hint: '.md', action: () => onExport('md') },
      { id: 'act-lore', group: 'more', label: '打开设定库', hint: '工具 · 设定', action: () => onOpenDrawer({ drawer: 'tools', tab: 'lore' }) },
      { id: 'act-foreshadow', group: 'more', label: '打开伏笔追踪', hint: '工具 · 伏笔', action: () => onOpenDrawer({ drawer: 'tools', tab: 'foreshadow' }) },
      { id: 'act-ideas', group: 'more', label: '打开灵感箱', hint: '工具 · 灵感', action: () => onOpenDrawer({ drawer: 'tools', tab: 'ideas' }) },
      { id: 'act-ai', group: 'more', label: '打开AI对话', hint: '工具 · AI', action: () => onOpenDrawer({ drawer: 'tools', tab: 'ai' }) },
      { id: 'act-appearance', group: 'more', label: '外观设置', hint: '主题·字体', action: () => onOpenOverlay('appearance') },
      { id: 'act-ai-settings', group: 'more', label: 'AI 设置', hint: '提供者·模型·API Key', action: () => onOpenOverlay('ai-settings') },
    ];
    if (rightDockOpen) {
      list.push({ id: 'act-close-right-dock', group: 'more', label: '隐藏素材面板', hint: 'Ctrl+J', action: onCloseRightDock });
    }
    return list;
  }, [onOpenDrawer, onOpenOverlay, onExport, onCreateSnapshot, rightDockOpen, onCloseRightDock]);

  const staticItems = useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = [];
    for (const ch of activeWork.chapters) {
      items.push({
        id: `ch-${ch.id}`,
        kind: 'chapter',
        group: 'chapter',
        label: ch.title,
        hint: `${ch.wordCount.toLocaleString()} 字${ch.id === activeChapterId ? ' · 当前' : ''}`,
        action: () => onSelectChapter(ch.id),
      });
    }
    for (const lore of activeWork.lore) {
      items.push({
        id: `lore-${lore.id}`,
        kind: 'lore',
        group: 'lore',
        label: lore.name,
        hint: `${lore.type} · ${lore.description.slice(0, 20)}`,
        action: () => onOpenDrawer({ drawer: 'tools', tab: 'lore' }),
      });
    }
    for (const work of works) {
      if (work.id === activeWork.id) continue;
      items.push({
        id: `work-${work.id}`,
        kind: 'work',
        group: 'work',
        label: work.title,
        hint: `${work.chapters.length} 章 · ${work.genre}`,
        action: () => onSelectWork(work.id),
      });
    }
    const collectionMap = new Map(library.collections.map((c) => [c.id, c.name]));
    for (const mat of library.items) {
      const collectionName = collectionMap.get(mat.collectionId) ?? '未分册';
      const tagHint = mat.tags.length > 0 ? ` · #${mat.tags.slice(0, 2).join(' #')}` : '';
      items.push({
        id: `mat-${mat.id}`,
        kind: 'material',
        group: 'material',
        label: mat.title || '未命名素材',
        hint: `${mat.kind} · ${collectionName}${tagHint}`,
        action: () => onPinMaterial(mat.id),
      });
    }
    return items;
  }, [works, activeWork, activeChapterId, onSelectChapter, onSelectWork, onOpenDrawer, library, onPinMaterial]);

  const allActions = useMemo(
    () => actionDefs.map((a): PaletteItem => ({ ...a, kind: 'action' })),
    [actionDefs],
  );

  const filtered = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      const out: PaletteItem[] = [];
      const recentIds = topIds(actionDefs.map((a) => a.id), 5);
      const recentSet = new Set(recentIds);
      for (const id of recentIds) {
        const match = actionDefs.find((a) => a.id === id);
        if (match) out.push({ ...match, kind: 'action', group: 'recent' });
      }
      const groupOrder: ActionGroup[] = ['core', 'export', 'more'];
      for (const g of groupOrder) {
        for (const a of actionDefs) {
          if (a.group !== g) continue;
          if (recentSet.has(a.id)) continue;
          out.push({ ...a, kind: 'action' });
        }
      }
      for (const s of staticItems) out.push(s);
      return out;
    }

    const matched: PaletteItem[] = [];
    const seen = new Set<string>();

    for (const item of [...allActions, ...staticItems]) {
      if (item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q)) {
        matched.push(item);
        seen.add(item.id);
      }
    }

    for (const ch of activeWork.chapters) {
      if (seen.has(`ch-${ch.id}`)) continue;
      if (ch.content.toLowerCase().includes(q)) {
        const idx = ch.content.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 10);
        const snippet = ch.content.slice(start, start + 40).replace(/\n/g, ' ');
        matched.push({
          id: `match-${ch.id}`,
          kind: 'match',
          group: 'match',
          label: ch.title,
          hint: `...${snippet}...`,
          action: () => onSelectChapter(ch.id),
        });
      }
    }

    for (const mat of library.items) {
      if (seen.has(`mat-${mat.id}`)) continue;
      if (mat.body.toLowerCase().includes(q)) {
        const idx = mat.body.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 10);
        const snippet = mat.body.slice(start, start + 40).replace(/\n/g, ' ');
        matched.push({
          id: `mat-body-${mat.id}`,
          kind: 'material',
          group: 'material',
          label: mat.title || '未命名素材',
          hint: `${mat.kind} · ...${snippet}...`,
          action: () => onPinMaterial(mat.id),
        });
      }
    }

    if (q.includes('快照') || q.includes('恢复')) {
      for (const snap of snapshots.slice(0, 5)) {
        matched.push({
          id: `snap-${snap.id}`,
          kind: 'action',
          group: 'more',
          label: `恢复快照: ${snap.chapterTitle}`,
          hint: `${snap.wordCount} 字 · ${new Date(snap.createdAt).toLocaleString('zh-CN')}`,
          action: () => onRestoreSnapshot(snap),
        });
      }
    }

    return matched;
  }, [query, actionDefs, allActions, staticItems, activeWork, snapshots, topIds, onSelectChapter, onRestoreSnapshot, library, onPinMaterial]);

  const clampedSelected = filtered.length > 0 ? Math.min(selected, filtered.length - 1) : 0;

  const setAndScroll = useCallback((index: number) => {
    setSelected(index);
    const el = resultsRef.current?.querySelector<HTMLElement>(`[data-row-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, []);

  const invoke = (item: PaletteItem) => {
    if (item.kind === 'action') record(item.id.startsWith('act-') ? item.id : item.id);
    item.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAndScroll((clampedSelected + 1) % Math.max(1, filtered.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAndScroll((clampedSelected - 1 + filtered.length) % Math.max(1, filtered.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = filtered[clampedSelected]; if (it) invoke(it); }
    else if (e.key === 'Escape') { onClose(); }
  };

  const showHeaders = query.trim().length === 0;

  return (
    <div className="command-palette" onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-label="命令面板">
      <input
        ref={inputRef}
        className="palette-input"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
        placeholder="搜索章节、正文、人物、设定，或执行操作..."
        spellCheck={false}
      />
      <div className="palette-results" ref={resultsRef}>
        {filtered.length === 0 && <div className="palette-empty">没有找到匹配项</div>}
        {filtered.map((item, i) => {
          const prev = i > 0 ? filtered[i - 1] : null;
          const showHeader = showHeaders && (!prev || prev.group !== item.group);
          return (
            <Fragment key={item.id}>
              {showHeader && (
                <div className="palette-group-header">{GROUP_LABELS[item.group]}</div>
              )}
              <button
                data-row-index={i}
                className={`palette-item${i === clampedSelected ? ' is-selected' : ''}`}
                onClick={() => invoke(item)}
                onMouseEnter={() => setSelected(i)}
                type="button"
              >
                <span className="palette-kind">{KIND_LABELS[item.kind]}</span>
                <span className="palette-label">{item.label}</span>
                {item.hint && <span className="palette-hint">{item.hint}</span>}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
