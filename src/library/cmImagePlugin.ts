import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

export type AssetResolver = (id: string) => string | undefined;

const IMG_RE = /!\[([^\]]*)\]\(asset:([a-zA-Z0-9-]+)\)/g;

class AssetImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string, readonly id: string) {
    super();
  }
  eq(other: AssetImageWidget): boolean {
    return other.src === this.src && other.alt === this.alt && other.id === this.id;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-asset-img';
    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    img.loading = 'lazy';
    img.draggable = false;
    span.appendChild(img);
    return span;
  }
  ignoreEvent() {
    return false;
  }
}

class MissingWidget extends WidgetType {
  constructor(readonly id: string) {
    super();
  }
  eq(other: MissingWidget): boolean {
    return other.id === this.id;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-asset-img-missing';
    span.textContent = `[图片缺失: ${this.id.slice(0, 8)}…]`;
    return span;
  }
}

function buildDecorations(view: EditorView, resolve: AssetResolver): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const selections = view.state.selection.ranges;

  const matches: { start: number; end: number; alt: string; id: string }[] = [];
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    IMG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMG_RE.exec(text)) !== null) {
      matches.push({
        start: from + m.index,
        end: from + m.index + m[0].length,
        alt: m[1],
        id: m[2],
      });
    }
  }
  matches.sort((a, b) => a.start - b.start);

  for (const match of matches) {
    const cursorInside = selections.some(
      (sel) => sel.from <= match.end && sel.to >= match.start,
    );
    if (cursorInside) continue;
    const url = resolve(match.id);
    const deco = url
      ? Decoration.replace({ widget: new AssetImageWidget(url, match.alt, match.id) })
      : Decoration.replace({ widget: new MissingWidget(match.id) });
    builder.add(match.start, match.end, deco);
  }
  return builder.finish();
}

export function assetImagePlugin(resolve: AssetResolver) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, resolve);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view, resolve);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );
}
