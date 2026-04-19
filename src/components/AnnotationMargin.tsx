import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AnchorMark } from './InlineAnnotationLayer';

interface AnnotationMarginProps {
  marks: AnchorMark[];
  layerRef: React.RefObject<HTMLDivElement | null>;
  anchorRef: React.RefObject<HTMLElement | null>;
  scrollTick: number;
  onFocusMark: (mark: AnchorMark) => void;
  onOpenMark: (mark: AnchorMark) => void;
}

interface CardPosition {
  markIdx: number;
  top: number;
}

const STATE_LABEL: Record<AnchorMark['kind'], string> = {
  planted: '埋下',
  echoed: '回响',
  paid_off: '回收',
  idea: '灵感',
};

const MIN_CARD_HEIGHT = 68;
const CARD_GAP = 10;

export function AnnotationMargin({
  marks,
  layerRef,
  anchorRef,
  scrollTick,
  onFocusMark,
  onOpenMark,
}: AnnotationMarginProps) {
  const [positions, setPositions] = useState<CardPosition[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [measureTick, setMeasureTick] = useState(0);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const anchorEl = anchorRef.current;
    if (!layer || !anchorEl || marks.length === 0) {
      setPositions([]);
      return;
    }
    const baseRect = anchorEl.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const visibleTop = layerRect.top;
    const visibleBottom = layerRect.bottom;

    const idToSpan = new Map<string, DOMRect>();
    const spans = layer.querySelectorAll<HTMLElement>('.anchor-mark[data-anchor-id]');
    spans.forEach((span) => {
      const id = span.dataset.anchorId;
      if (!id) return;
      if (!idToSpan.has(id)) {
        idToSpan.set(id, span.getBoundingClientRect());
      }
    });

    const raw: CardPosition[] = [];
    marks.forEach((mark, idx) => {
      const rect = idToSpan.get(mark.id);
      if (!rect) return;
      if (rect.bottom < visibleTop - 8 || rect.top > visibleBottom + 8) return;
      raw.push({ markIdx: idx, top: rect.top - baseRect.top });
    });

    raw.sort((a, b) => a.top - b.top);
    let cursor = -Infinity;
    const stacked = raw.map((p) => {
      const heightAt = cardRefs.current[p.markIdx]?.offsetHeight ?? MIN_CARD_HEIGHT;
      const adjusted = Math.max(p.top, cursor);
      cursor = adjusted + heightAt + CARD_GAP;
      return { ...p, top: adjusted };
    });

    setPositions(stacked);
  }, [marks, scrollTick, measureTick, layerRef, anchorRef]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      setMeasureTick((t) => t + 1);
    });
    cardRefs.current.forEach((card) => {
      if (card) ro.observe(card);
    });
    return () => ro.disconnect();
  }, [marks]);

  if (marks.length === 0) return null;

  const positionByIdx = new Map(positions.map((p) => [p.markIdx, p.top]));

  return (
    <aside className="annotation-margin" aria-label="本章锚点批注">
      {marks.map((mark, idx) => {
        const top = positionByIdx.get(idx);
        if (top === undefined) return null;
        return (
          <div
            key={mark.id}
            ref={(el) => { cardRefs.current[idx] = el; }}
            className={`annotation-margin-card is-${mark.kind}${hoveredId === mark.id ? ' is-hovered' : ''}`}
            style={{ top: `${top}px` }}
            onMouseEnter={() => setHoveredId(mark.id)}
            onMouseLeave={() => setHoveredId((cur) => (cur === mark.id ? null : cur))}
            onClick={() => onFocusMark(mark)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFocusMark(mark);
              }
            }}
          >
            {mark.kind === 'idea' ? (
              <p className="margin-card-idea">{mark.preview}</p>
            ) : (
              <>
                <div className="margin-card-head">
                  <span className={`foreshadow-state-dot is-${mark.kind}`} />
                  <span className="margin-card-kind">{STATE_LABEL[mark.kind]}</span>
                  <strong className="margin-card-title">{mark.title}</strong>
                  {mark.foreshadowId && (
                    <button
                      type="button"
                      className="margin-card-open"
                      onClick={(e) => { e.stopPropagation(); onOpenMark(mark); }}
                      aria-label="打开详情"
                      title="打开详情"
                    >›</button>
                  )}
                </div>
                {mark.preview && <p className="margin-card-preview">{mark.preview}</p>}
              </>
            )}
          </div>
        );
      })}
    </aside>
  );
}
