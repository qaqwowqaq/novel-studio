import { useMemo } from 'react';
import type { Anchor, Chapter, Foreshadow, ForeshadowState, IdeaNote } from '../types';

interface AnnotationPanelProps {
  chapter: Chapter;
  foreshadows: Foreshadow[];
  ideas: IdeaNote[];
  onJumpToAnchor: (anchor: Anchor) => void;
  onOpenForeshadow: (id: string) => void;
  onClose: () => void;
}

interface StageHit {
  foreshadow: Foreshadow;
  stateKey: ForeshadowState;
  anchor: Anchor;
  note: string;
}

const STATE_LABEL: Record<ForeshadowState, string> = {
  planted: '埋下',
  echoed: '回响',
  paid_off: '回收',
};

function previewExcerpt(excerpt: string): string {
  const clean = excerpt.replace(/\s+/g, ' ').trim();
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean;
}

export function AnnotationPanel({
  chapter,
  foreshadows,
  ideas,
  onJumpToAnchor,
  onOpenForeshadow,
  onClose,
}: AnnotationPanelProps) {
  const stageHits = useMemo<StageHit[]>(() => {
    const hits: StageHit[] = [];
    for (const f of foreshadows) {
      const stages: Array<[ForeshadowState, typeof f.planted]> = [
        ['planted', f.planted],
        ['echoed', f.echoed],
        ['paid_off', f.paidOff],
      ];
      for (const [stateKey, stage] of stages) {
        if (stage?.anchor?.chapterId === chapter.id && stage.anchor.excerpt) {
          hits.push({ foreshadow: f, stateKey, anchor: stage.anchor, note: stage.note });
        }
      }
    }
    return hits;
  }, [foreshadows, chapter.id]);

  const anchoredIdeas = useMemo(
    () => ideas.filter((i) => i.anchor?.chapterId === chapter.id && i.anchor.excerpt),
    [ideas, chapter.id],
  );

  const isEmpty = stageHits.length === 0 && anchoredIdeas.length === 0;

  return (
    <aside className="annotation-panel" aria-label="本章锚点">
      <header className="annotation-head">
        <div className="annotation-head-text">
          <span className="annotation-title">本章锚点</span>
          <span className="annotation-sub">{chapter.title}</span>
        </div>
        <button className="drawer-close" type="button" onClick={onClose} aria-label="关闭锚点面板">✕</button>
      </header>

      <div className="annotation-body">
        {isEmpty && (
          <div className="annotation-empty">
            <p>本章还没有锚定的伏笔或灵感。</p>
            <p className="annotation-empty-hint">选中正文中的一段 → 右键 →「在此埋下伏笔」或「加入灵感（锚定此段）」</p>
          </div>
        )}

        {stageHits.length > 0 && (
          <section className="annotation-section">
            <h4 className="annotation-section-head">
              <span>伏笔</span>
              <span className="annotation-count">{stageHits.length}</span>
            </h4>
            <div className="annotation-list">
              {stageHits.map((hit) => (
                <div key={`${hit.foreshadow.id}-${hit.stateKey}`} className="annotation-card">
                  <button
                    type="button"
                    className="annotation-card-body"
                    onClick={() => onJumpToAnchor(hit.anchor)}
                    title="跳到正文"
                  >
                    <div className="annotation-card-row">
                      <span className={`foreshadow-state-dot is-${hit.stateKey}`} />
                      <strong className="annotation-card-title">{hit.foreshadow.title || '未命名伏笔'}</strong>
                      <span className={`foreshadow-state-badge is-${hit.stateKey}`}>{STATE_LABEL[hit.stateKey]}</span>
                    </div>
                    <blockquote className="annotation-excerpt">{previewExcerpt(hit.anchor.excerpt)}</blockquote>
                    {hit.note && <p className="annotation-note">{hit.note}</p>}
                  </button>
                  <button
                    type="button"
                    className="annotation-card-open"
                    onClick={() => onOpenForeshadow(hit.foreshadow.id)}
                    title="打开伏笔卡"
                  >详情</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {anchoredIdeas.length > 0 && (
          <section className="annotation-section">
            <h4 className="annotation-section-head">
              <span>灵感</span>
              <span className="annotation-count">{anchoredIdeas.length}</span>
            </h4>
            <div className="annotation-list">
              {anchoredIdeas.map((idea) => (
                <button
                  key={idea.id}
                  type="button"
                  className="annotation-card annotation-card-simple"
                  onClick={() => idea.anchor && onJumpToAnchor(idea.anchor)}
                  title="跳到正文"
                >
                  <div className="annotation-card-row">
                    <span className="annotation-idea-icon" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18h6" />
                        <path d="M10 21h4" />
                        <path d="M12 3a6 6 0 0 0-4 10.5c.7.8 1 1.7 1 2.5v1h6v-1c0-.8.3-1.7 1-2.5A6 6 0 0 0 12 3Z" />
                      </svg>
                    </span>
                    <p className="annotation-idea-text">{idea.content}</p>
                  </div>
                  {idea.anchor?.excerpt && (
                    <blockquote className="annotation-excerpt">{previewExcerpt(idea.anchor.excerpt)}</blockquote>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
