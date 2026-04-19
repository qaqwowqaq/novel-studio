import { useEffect, useMemo, useRef, useState } from 'react';
import type { Chapter, ChapterSnapshot, Work } from '../types';
import { formatDateTime } from '../utils';

interface ChapterDrawerProps {
  works: Work[];
  activeWork: Work;
  activeChapterId: string;
  snapshots: ChapterSnapshot[];
  onSelectChapter: (id: string) => void;
  onAddChapter: (title: string, volumeId?: string) => void;
  onAddVolume: (title: string) => void;
  onRenameVolume: (volumeId: string, title: string) => void;
  onReorderChapter: (chapterId: string, direction: 'up' | 'down') => void;
  onReorderVolume: (volumeId: string, direction: 'up' | 'down') => void;
  onMoveChapterToVolume: (chapterId: string, targetVolumeId: string | undefined) => void;
  onDeleteChapter: (chapterId: string) => void;
  onDeleteVolume: (volumeId: string, keepChapters: boolean) => void;
  onRestoreSnapshot: (snapshot: ChapterSnapshot) => void;
  onOpenWorksLibrary: () => void;
  onClose: () => void;
}

type SecondaryView = 'none' | 'snapshots';

const UNASSIGNED = '__unassigned__';

interface VolumeGroup {
  id: string;
  title: string;
  chapters: Chapter[];
  isReal: boolean;
}

function groupChaptersByVolume(work: Work): VolumeGroup[] {
  const volumes = work.volumes ?? [];
  const byVolume = new Map<string, Chapter[]>();
  for (const v of volumes) byVolume.set(v.id, []);
  const unassigned: Chapter[] = [];
  for (const ch of work.chapters) {
    if (ch.volumeId && byVolume.has(ch.volumeId)) {
      byVolume.get(ch.volumeId)!.push(ch);
    } else {
      unassigned.push(ch);
    }
  }
  const groups: VolumeGroup[] = volumes.map((v) => ({
    id: v.id,
    title: v.title,
    chapters: byVolume.get(v.id) ?? [],
    isReal: true,
  }));
  if (unassigned.length > 0 || volumes.length === 0) {
    groups.push({
      id: UNASSIGNED,
      title: volumes.length === 0 ? '所有章节' : '未分卷',
      chapters: unassigned,
      isReal: false,
    });
  }
  return groups;
}

export function ChapterDrawer({
  works,
  activeWork,
  activeChapterId,
  snapshots,
  onSelectChapter,
  onAddChapter,
  onAddVolume,
  onRenameVolume,
  onReorderChapter,
  onReorderVolume,
  onMoveChapterToVolume,
  onDeleteChapter,
  onDeleteVolume,
  onRestoreSnapshot,
  onOpenWorksLibrary,
  onClose,
}: ChapterDrawerProps) {
  const groups = useMemo(() => groupChaptersByVolume(activeWork), [activeWork]);
  const realVolumes = activeWork.volumes ?? [];

  const activeGroupId = useMemo(() => {
    const active = activeWork.chapters.find((c) => c.id === activeChapterId);
    if (!active) return groups[0]?.id ?? UNASSIGNED;
    if (active.volumeId && groups.some((g) => g.id === active.volumeId)) return active.volumeId;
    return UNASSIGNED;
  }, [activeWork, activeChapterId, groups]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.id] = g.id !== activeGroupId;
    return init;
  });

  const [addChapterFor, setAddChapterFor] = useState<string | null>(null);
  const [chapterDraft, setChapterDraft] = useState('');
  const [isAddingVolume, setIsAddingVolume] = useState(false);
  const [volumeDraft, setVolumeDraft] = useState('');
  const [renamingVolumeId, setRenamingVolumeId] = useState<string | null>(null);
  const [volumeRename, setVolumeRename] = useState('');
  const [secondary, setSecondary] = useState<SecondaryView>('none');
  const [chapterMenuFor, setChapterMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chapterMenuFor) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setChapterMenuFor(null);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [chapterMenuFor]);

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startAddChapter = (groupId: string) => {
    setCollapsed((prev) => ({ ...prev, [groupId]: false }));
    setAddChapterFor(groupId);
    setChapterDraft('');
  };

  const commitAddChapter = () => {
    if (!addChapterFor || !chapterDraft.trim()) {
      setAddChapterFor(null);
      setChapterDraft('');
      return;
    }
    onAddChapter(chapterDraft.trim(), addChapterFor === UNASSIGNED ? undefined : addChapterFor);
    setAddChapterFor(null);
    setChapterDraft('');
  };

  const commitAddVolume = () => {
    if (!volumeDraft.trim()) {
      setIsAddingVolume(false);
      setVolumeDraft('');
      return;
    }
    onAddVolume(volumeDraft.trim());
    setIsAddingVolume(false);
    setVolumeDraft('');
  };

  const commitRenameVolume = () => {
    if (renamingVolumeId && volumeRename.trim()) {
      onRenameVolume(renamingVolumeId, volumeRename.trim());
    }
    setRenamingVolumeId(null);
    setVolumeRename('');
  };

  const confirmDeleteChapter = (ch: Chapter) => {
    const ok = window.confirm(`确定删除章节"${ch.title}"？正文与相关快照会一并删除。`);
    if (ok) {
      onDeleteChapter(ch.id);
      setChapterMenuFor(null);
    }
  };

  const confirmDeleteVolume = (volumeId: string, title: string, chapterCount: number) => {
    if (chapterCount === 0) {
      const ok = window.confirm(`删除空卷"${title}"？`);
      if (ok) onDeleteVolume(volumeId, true);
      return;
    }
    const keep = window.confirm(
      `卷"${title}"下有 ${chapterCount} 章。\n\n确定：保留章节（章节会移到"未分卷"）\n取消：放弃删除`,
    );
    if (keep) onDeleteVolume(volumeId, true);
  };

  const chapterSnapshots = snapshots.filter((s) =>
    activeWork.chapters.some((c) => c.id === s.chapterId),
  );

  const renderChapterRow = (ch: Chapter, group: VolumeGroup, idx: number) => {
    const isActive = ch.id === activeChapterId;
    const canUp = idx > 0;
    const canDown = idx < group.chapters.length - 1;
    const showMenu = chapterMenuFor === ch.id;
    return (
      <div key={ch.id} className={`tree-chapter${isActive ? ' is-active' : ''}`}>
        <button className="tree-chapter-main" type="button" onClick={() => onSelectChapter(ch.id)}>
          <span className="tree-chapter-title">{ch.title}</span>
          <span className="tree-chapter-meta">{ch.wordCount.toLocaleString()}</span>
        </button>
        <div className="tree-chapter-actions">
          <button
            type="button"
            className="row-icon-btn"
            disabled={!canUp}
            onClick={(e) => { e.stopPropagation(); onReorderChapter(ch.id, 'up'); }}
            title="上移"
          >↑</button>
          <button
            type="button"
            className="row-icon-btn"
            disabled={!canDown}
            onClick={(e) => { e.stopPropagation(); onReorderChapter(ch.id, 'down'); }}
            title="下移"
          >↓</button>
          <button
            type="button"
            className="row-icon-btn"
            onClick={(e) => { e.stopPropagation(); setChapterMenuFor(showMenu ? null : ch.id); }}
            title="更多"
          >⋯</button>
        </div>
        {showMenu && (
          <div className="row-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <div className="row-menu-label">移到卷</div>
            {realVolumes.map((v) => (
              <button
                key={v.id}
                type="button"
                className="row-menu-item"
                disabled={ch.volumeId === v.id}
                onClick={() => { onMoveChapterToVolume(ch.id, v.id); setChapterMenuFor(null); }}
              >
                {v.title}
                {ch.volumeId === v.id && <span className="row-menu-check">· 当前</span>}
              </button>
            ))}
            <button
              type="button"
              className="row-menu-item"
              disabled={!ch.volumeId}
              onClick={() => { onMoveChapterToVolume(ch.id, undefined); setChapterMenuFor(null); }}
            >
              移出分卷
              {!ch.volumeId && <span className="row-menu-check">· 当前</span>}
            </button>
            <div className="row-menu-sep" />
            <button
              type="button"
              className="row-menu-item is-danger"
              onClick={() => confirmDeleteChapter(ch)}
            >
              删除章节
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="drawer drawer-left" role="dialog" aria-modal="true" aria-label="章节目录">
      <div className="drawer-header">
        <h2>{activeWork.title}</h2>
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
      </div>

      <div className="drawer-scroll">
        <div className="tree-root">
          {groups.map((group, gi) => {
            const isCollapsed = collapsed[group.id] ?? false;
            const isRenaming = renamingVolumeId === group.id;
            const volumeIndex = group.isReal ? realVolumes.findIndex((v) => v.id === group.id) : -1;
            const canVolUp = group.isReal && volumeIndex > 0;
            const canVolDown = group.isReal && volumeIndex >= 0 && volumeIndex < realVolumes.length - 1;
            return (
              <div key={group.id} className="tree-volume">
                <div className={`tree-volume-head${isCollapsed ? ' is-collapsed' : ''}`}>
                  <button
                    className="tree-volume-toggle"
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span className="tree-caret">▾</span>
                    {isRenaming ? (
                      <input
                        className="tree-volume-input"
                        autoFocus
                        value={volumeRename}
                        onChange={(e) => setVolumeRename(e.target.value)}
                        onBlur={commitRenameVolume}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRenameVolume();
                          else if (e.key === 'Escape') { setRenamingVolumeId(null); setVolumeRename(''); }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="tree-volume-title"
                        onDoubleClick={(e) => {
                          if (!group.isReal) return;
                          e.stopPropagation();
                          setRenamingVolumeId(group.id);
                          setVolumeRename(group.title);
                        }}
                      >
                        {group.title}
                      </span>
                    )}
                    <span className="tree-volume-meta">{group.chapters.length} 章</span>
                  </button>
                  {group.isReal && (
                    <div className="tree-volume-actions">
                      <button
                        type="button"
                        className="row-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsed((prev) => ({ ...prev, [group.id]: false }));
                          setRenamingVolumeId(group.id);
                          setVolumeRename(group.title);
                        }}
                        title="重命名（也可双击卷名）"
                      >✎</button>
                      <button
                        type="button"
                        className="row-icon-btn"
                        disabled={!canVolUp}
                        onClick={(e) => { e.stopPropagation(); onReorderVolume(group.id, 'up'); }}
                        title="上移卷"
                      >↑</button>
                      <button
                        type="button"
                        className="row-icon-btn"
                        disabled={!canVolDown}
                        onClick={(e) => { e.stopPropagation(); onReorderVolume(group.id, 'down'); }}
                        title="下移卷"
                      >↓</button>
                      <button
                        type="button"
                        className="row-icon-btn is-danger"
                        onClick={(e) => { e.stopPropagation(); confirmDeleteVolume(group.id, group.title, group.chapters.length); }}
                        title="删除卷"
                      >×</button>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="tree-volume-body">
                    {group.chapters.length === 0 && addChapterFor !== group.id && (
                      <div className="tree-empty">还没有章节</div>
                    )}
                    {group.chapters.map((ch, idx) => renderChapterRow(ch, group, idx))}

                    {addChapterFor === group.id ? (
                      <div className="tree-add-input">
                        <input
                          autoFocus
                          value={chapterDraft}
                          onChange={(e) => setChapterDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitAddChapter();
                            else if (e.key === 'Escape') { setAddChapterFor(null); setChapterDraft(''); }
                          }}
                          onBlur={() => { if (!chapterDraft.trim()) { setAddChapterFor(null); } }}
                          placeholder="章节名，例：雨夜入城（回车添加）"
                        />
                      </div>
                    ) : (
                      <button
                        className="tree-add-btn"
                        type="button"
                        onClick={() => startAddChapter(group.id)}
                      >
                        ＋ 新章节
                      </button>
                    )}
                  </div>
                )}
                {gi < groups.length - 1 && <div className="tree-volume-gap" />}
              </div>
            );
          })}

          {isAddingVolume ? (
            <div className="tree-add-volume">
              <input
                autoFocus
                value={volumeDraft}
                onChange={(e) => setVolumeDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAddVolume();
                  else if (e.key === 'Escape') { setIsAddingVolume(false); setVolumeDraft(''); }
                }}
                onBlur={() => { if (!volumeDraft.trim()) setIsAddingVolume(false); }}
                placeholder="卷名，例：破晓（回车添加）"
              />
            </div>
          ) : (
            <button className="tree-new-volume" type="button" onClick={() => setIsAddingVolume(true)}>
              ＋ 新建卷
            </button>
          )}
        </div>
      </div>

      <div className="drawer-rail">
        <button
          className={`rail-chip${secondary === 'snapshots' ? ' is-active' : ''}`}
          type="button"
          onClick={() => setSecondary(secondary === 'snapshots' ? 'none' : 'snapshots')}
        >
          快照 {chapterSnapshots.length}
        </button>
        <button
          className="rail-chip rail-chip-library"
          type="button"
          onClick={onOpenWorksLibrary}
          title="作品库 (⌘⇧O)"
        >
          作品库 {works.length}
        </button>
      </div>

      {secondary === 'snapshots' && (
        <div className="drawer-secondary">
          {chapterSnapshots.length === 0 ? (
            <div className="drawer-secondary-empty">暂无快照。⌘K → "创建快照"</div>
          ) : (
            <div className="snapshot-list">
              {chapterSnapshots.slice(0, 20).map((snap) => (
                <div key={snap.id} className="snapshot-item">
                  <div className="snapshot-info">
                    <span className="snapshot-title">{snap.chapterTitle}</span>
                    <span className="snapshot-meta">{snap.wordCount} 字 · {formatDateTime(snap.createdAt)}</span>
                  </div>
                  <button type="button" className="snapshot-restore-btn" onClick={() => onRestoreSnapshot(snap)}>恢复</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
