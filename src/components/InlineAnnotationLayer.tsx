import { forwardRef, useMemo } from 'react';

export type AnchorMarkKind = 'planted' | 'echoed' | 'paid_off' | 'idea';

export interface AnchorMark {
  id: string;
  start: number;
  end: number;
  kind: AnchorMarkKind;
  title: string;
  preview: string;
  foreshadowId?: string;
}

interface InlineAnnotationLayerProps {
  content: string;
  marks: AnchorMark[];
}

interface Segment {
  text: string;
  kind?: AnchorMarkKind;
  id?: string;
}

function buildSegments(content: string, marks: AnchorMark[]): Segment[] {
  if (marks.length === 0) return [{ text: content }];
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const m of sorted) {
    const s = Math.max(m.start, pos);
    const e = Math.max(s, m.end);
    if (s > pos) out.push({ text: content.slice(pos, s) });
    if (e > s) out.push({ text: content.slice(s, e), kind: m.kind, id: m.id });
    pos = Math.max(pos, e);
  }
  if (pos < content.length) out.push({ text: content.slice(pos) });
  return out;
}

export const InlineAnnotationLayer = forwardRef<HTMLDivElement, InlineAnnotationLayerProps>(
  function InlineAnnotationLayer({ content, marks }, ref) {
    const segments = useMemo(() => buildSegments(content, marks), [content, marks]);
    return (
      <div ref={ref} className="annotation-layer" aria-hidden>
        <div className="annotation-layer-inner">
          {segments.map((seg, i) =>
            seg.kind ? (
              <span key={i} className={`anchor-mark anchor-${seg.kind}`} data-anchor-id={seg.id}>{seg.text}</span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
      </div>
    );
  },
);
