import { useEffect, useEffectEvent, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
import {
  HighlightStyle,
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { tags as t } from '@lezer/highlight';
import type { AssetRecord } from '../types';
import { assetImagePlugin } from '../library/cmImagePlugin';

interface Props {
  initialValue: string;
  value: string;
  onChange: (value: string) => void;
  onPasteImage: (file: File) => Promise<string | null>;
  onDropImage: (file: File) => Promise<string | null>;
  assetMap: Map<string, AssetRecord>;
  placeholder?: string;
}

const markdownHighlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.5em', fontWeight: '700', color: 'var(--ink)' },
  { tag: t.heading2, fontSize: '1.28em', fontWeight: '600', color: 'var(--ink)' },
  { tag: t.heading3, fontSize: '1.12em', fontWeight: '600', color: 'var(--ink)' },
  { tag: t.heading4, fontWeight: '600', color: 'var(--ink)' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--accent)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono, ui-monospace, monospace)', background: 'rgba(45,34,24,0.06)', padding: '0 3px', borderRadius: '3px' },
  { tag: t.quote, color: 'var(--ink-muted)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--accent)' },
  { tag: t.meta, color: 'var(--ink-faint)' },
]);

export function MarkdownLiveEditor({
  initialValue,
  value,
  onChange,
  onPasteImage,
  onDropImage,
  assetMap,
  placeholder,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const assetsCompRef = useRef(new Compartment());

  const handleChange = useEffectEvent((next: string) => onChange(next));
  const handlePaste = useEffectEvent((file: File) => onPasteImage(file));
  const handleDrop = useEffectEvent((file: File) => onDropImage(file));

  // mount once per item (parent remounts via key)
  useEffect(() => {
    if (!hostRef.current) return;
    const assetsComp = assetsCompRef.current;
    const resolve = (id: string) => assetMap.get(id)?.dataUrl;

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        indentOnInput(),
        bracketMatching(),
        syntaxHighlighting(markdownHighlight),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        assetsComp.of(assetImagePlugin(resolve)),
        EditorView.lineWrapping,
        placeholder ? placeholderExt(placeholder) : [],
        EditorView.updateListener.of((u) => {
          if (u.docChanged) handleChange(u.state.doc.toString());
        }),
        EditorView.domEventHandlers({
          paste: (event, view) => {
            const items = Array.from(event.clipboardData?.items ?? []);
            const imgItem = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
            if (!imgItem) return false;
            const file = imgItem.getAsFile();
            if (!file) return false;
            event.preventDefault();
            const pos = view.state.selection.main.head;
            void handlePaste(file).then((ref) => {
              if (!ref) return;
              view.dispatch({
                changes: { from: pos, insert: ref },
                selection: { anchor: pos + ref.length },
              });
            });
            return true;
          },
          drop: (event, view) => {
            const files = Array.from(event.dataTransfer?.files ?? []);
            const img = files.find((f) => f.type.startsWith('image/'));
            if (!img) return false;
            event.preventDefault();
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.head;
            void handleDrop(img).then((ref) => {
              if (!ref) return;
              view.dispatch({
                changes: { from: pos, insert: ref },
                selection: { anchor: pos + ref.length },
              });
            });
            return true;
          },
        }),
        EditorView.theme({
          '&': {
            fontSize: '15px',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
            color: 'var(--ink)',
          },
          '&.cm-focused': { outline: 'none' },
          '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.85' },
          '.cm-content': {
            padding: '0',
            caretColor: 'var(--ink)',
            minHeight: '300px',
          },
          '.cm-line': { padding: '0' },
          '.cm-cursor': { borderLeftColor: 'var(--ink)', borderLeftWidth: '2px' },
          '.cm-selectionBackground, ::selection': { background: 'rgba(142, 89, 48, 0.18) !important' },
          '.cm-asset-img': {
            display: 'inline-block',
            maxWidth: '100%',
            margin: '2px 0',
          },
          '.cm-asset-img img': {
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          },
          '.cm-asset-img-missing': {
            display: 'inline-block',
            padding: '2px 8px',
            border: '1px dashed var(--drawer-border)',
            borderRadius: '4px',
            color: 'var(--ink-faint)',
            fontSize: '12px',
          },
          '.cm-placeholder': { color: 'var(--ink-faint)', fontStyle: 'normal' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reconfigure the image resolver when assetMap identity changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const resolve = (id: string) => assetMap.get(id)?.dataUrl;
    view.dispatch({
      effects: assetsCompRef.current.reconfigure(assetImagePlugin(resolve)),
    });
  }, [assetMap]);

  // push external value changes (e.g., "insert skeleton" button) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return <div ref={hostRef} className="library-md-host" />;
}
