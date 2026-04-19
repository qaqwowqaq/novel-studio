import { useMemo } from 'react';
import type { Chapter, Work } from '../types';
import { countChars } from '../utils';

export type LeftDockTab = 'outline' | 'volume';

interface LeftDockProps {
  work: Work;
  chapter: Chapter | null;
  tab: LeftDockTab;
  onTabChange: (tab: LeftDockTab) => void;
  onUpdateOutline: (outline: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onClose: () => void;
}

interface VolumeGroup {
  id: string | null;
  title: string;
  chapters: Chapter[];
}

function groupByVolume(work: Work, activeChapter: Chapter | null): VolumeGroup[] {
  const volumes = work.volumes ?? [];
  const activeVolumeId = activeChapter?.volumeId ?? null;
  // Only return the CURRENT volume (the one the writer is in), or unassigned fallback.
  if (activeVolumeId) {
    const vol = volumes.find((v) => v.id === activeVolumeId);
    const chapters = work.chapters.filter((c) => c.volumeId === activeVolumeId);
    if (vol) return [{ id: vol.id, title: vol.title, chapters }];
  }
  const unassigned = work.chapters.filter((c) => !c.volumeId);
  return [{ id: null, title: volumes.length === 0 ? '所有章节' : '未分卷', chapters: unassigned }];
}

function summaryPreview(chapter: Chapter): string {
  if (chapter.summary.trim()) return chapter.summary.trim();
  const body = chapter.content.replace(/\s+/g, ' ').trim();
  return body.length > 80 ? `${body.slice(0, 80)}…` : body;
}

export function LeftDock({
  work,
  chapter,
  tab,
  onTabChange,
  onUpdateOutline,
  onSelectChapter,
  onClose,
}: LeftDockProps) {
  const groups = useMemo(() => groupByVolume(work, chapter), [work, chapter]);

  return (
    <aside className="left-dock" role="complementary" aria-label="写作导航">
      <header className="left-dock-head">
        <div className="left-dock-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'volume'}
            className={`left-dock-tab${tab === 'volume' ? ' is-active' : ''}`}
            onClick={() => onTabChange('volume')}
          >卷纲</button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'outline'}
            className={`left-dock-tab${tab === 'outline' ? ' is-active' : ''}`}
            onClick={() => onTabChange('outline')}
          >章纲</button>
        </div>
        <button
          type="button"
          className="left-dock-close"
          onClick={onClose}
          title="关闭 (Ctrl+\\)"
          aria-label="关闭"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </header>

      <div className="left-dock-body">
        {tab === 'outline' && (
          <OutlineTab chapter={chapter} onUpdateOutline={onUpdateOutline} />
        )}
        {tab === 'volume' && (
          <VolumeTab groups={groups} activeChapterId={chapter?.id ?? ''} onSelectChapter={onSelectChapter} />
        )}
      </div>
    </aside>
  );
}

function OutlineTab({ chapter, onUpdateOutline }: { chapter: Chapter | null; onUpdateOutline: (v: string) => void }) {
  if (!chapter) return <div className="left-dock-empty">未选择章节</div>;
  return (
    <div className="left-dock-outline">
      <div className="left-dock-section-title">{chapter.title}</div>
      <textarea
        className="left-dock-outline-input"
        value={chapter.outline}
        onChange={(e) => onUpdateOutline(e.target.value)}
        placeholder={'本章目标：\n-\n-\n\n关键场景：\n-\n\n结尾钩子：'}
        spellCheck={false}
      />
    </div>
  );
}

function VolumeTab({
  groups,
  activeChapterId,
  onSelectChapter,
}: {
  groups: VolumeGroup[];
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
}) {
  return (
    <div className="left-dock-volume">
      {groups.map((group) => (
        <section key={group.id ?? '__unassigned__'} className="left-dock-vol-group">
          <div className="left-dock-section-title">{group.title}</div>
          {group.chapters.length === 0 && (
            <div className="left-dock-empty">暂无章节</div>
          )}
          <ol className="left-dock-chapter-list">
            {group.chapters.map((ch) => {
              const isActive = ch.id === activeChapterId;
              const preview = summaryPreview(ch);
              const wordCount = ch.wordCount || countChars(ch.content);
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    className={`left-dock-chapter${isActive ? ' is-active' : ''}`}
                    onClick={() => onSelectChapter(ch.id)}
                  >
                    <div className="left-dock-chapter-title-row">
                      <span className="left-dock-chapter-title">{ch.title}</span>
                      <span className="left-dock-chapter-count">{wordCount.toLocaleString()} 字</span>
                    </div>
                    {preview && <div className="left-dock-chapter-preview">{preview}</div>}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
