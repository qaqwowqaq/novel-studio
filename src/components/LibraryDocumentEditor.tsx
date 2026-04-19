import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AssetRecord, LibraryCollection, LibraryItem, LibraryItemKind } from '../types';
import { compressImageFile } from '../assets';
import { formatDateTime } from '../utils';
import { KIND_COLOR, KIND_ORDER } from '../library/constants';
import { MarkdownLiveEditor } from './MarkdownLiveEditor';

const KIND_OPTIONS = KIND_ORDER;

const SETTING_SKELETON = [
  '## 核心特征',
  '- ',
  '',
  '## 规则 / 机制',
  '- ',
  '',
  '## 限制与代价',
  '- ',
  '',
  '## 剧情用途',
  '- ',
  '',
].join('\n');

const IMAGE_MAX_EDGE = 1400;
const SAVE_DEBOUNCE_MS = 500;

interface LibraryDocumentEditorProps {
  item: LibraryItem;
  collections: LibraryCollection[];
  assetMap: Map<string, AssetRecord>;
  onSave: (patch: Partial<LibraryItem>, newAsset?: AssetRecord) => void;
  onDelete: () => void;
}

export function LibraryDocumentEditor({
  item,
  collections,
  assetMap,
  onSave,
  onDelete,
}: LibraryDocumentEditorProps) {
  const [title, setTitle] = useState(item.title);
  const [kind, setKind] = useState<LibraryItemKind>(item.kind);
  const [collectionId, setCollectionId] = useState(item.collectionId);
  const [body, setBody] = useState(item.body);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [source, setSource] = useState(item.source ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  const triggerSavedFlash = () => {
    setSavedFlash(true);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSavedFlash(false), 900);
  };

  const flushSave = useEffectEvent(() => {
    const patch: Partial<LibraryItem> = {
      title: title.trim() || '未命名素材',
      kind,
      collectionId,
      body,
      tags,
      source: source.trim() || undefined,
    };
    onSave(patch);
    triggerSavedFlash();
  });

  useEffect(() => {
    const timer = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [title, kind, collectionId, body, tags, source]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  const insertSettingSkeleton = () => {
    const needsNewline = body.length > 0 && body[body.length - 1] !== '\n';
    const next = body + (needsNewline ? '\n' : '') + SETTING_SKELETON;
    setBody(next);
  };

  const handlePastedImage = async (file: File): Promise<string | null> => {
    try {
      const asset = await compressImageFile(file, { maxEdge: IMAGE_MAX_EDGE });
      const alt = file.name ? file.name.replace(/\.[^.]+$/, '') : '图片';
      onSave({}, asset);
      triggerSavedFlash();
      return `![${alt}](asset:${asset.id})\n`;
    } catch (err) {
      console.error('图片处理失败', err);
      return null;
    }
  };

  const previewComponents = useMemo<Components>(() => ({
    img: ({ src, alt, ...rest }) => {
      if (typeof src === 'string' && src.startsWith('asset:')) {
        const id = src.slice('asset:'.length);
        const asset = assetMap.get(id);
        if (asset) {
          return <img src={asset.dataUrl} alt={alt ?? ''} {...rest} />;
        }
        return <span className="library-doc-img-missing">[图片未找到: {id.slice(0, 8)}…]</span>;
      }
      return <img src={src} alt={alt ?? ''} {...rest} />;
    },
  }), [assetMap]);

  return (
    <div className="library-doc">
      <div className="library-doc-actions">
        <span className={`library-doc-saved${savedFlash ? ' is-active' : ''}`} aria-hidden>
          {savedFlash ? '已保存' : `编辑于 ${formatDateTime(item.updatedAt)}`}
        </span>
        <button
          type="button"
          className={`library-doc-preview-toggle${showPreview ? ' is-active' : ''}`}
          onClick={() => setShowPreview((v) => !v)}
        >{showPreview ? '编辑' : '预览'}</button>
        <button
          type="button"
          className="library-doc-delete"
          onClick={onDelete}
        >删除</button>
      </div>

      <div className="library-doc-scroll">
        <input
          className="library-doc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="素材标题"
        />

        <div className="library-doc-props">
          <KindRow kind={kind} onChange={setKind} />
          <CollectionRow
            collections={collections}
            collectionId={collectionId}
            onChange={setCollectionId}
          />
          <TagsRow tags={tags} onChange={setTags} />
          <SourceRow source={source} onChange={setSource} />
          <CreatedRow createdAt={item.createdAt} />
        </div>

        <div className="library-doc-body-wrap">
          {showPreview ? (
            <div className="library-doc-preview">
              {body.trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={previewComponents}
                  urlTransform={(url) => url}
                >
                  {body}
                </ReactMarkdown>
              ) : (
                <p className="library-doc-preview-empty">（正文为空）</p>
              )}
            </div>
          ) : (
            <MarkdownLiveEditor
              initialValue={item.body}
              value={body}
              onChange={setBody}
              onPasteImage={handlePastedImage}
              onDropImage={handlePastedImage}
              assetMap={assetMap}
              placeholder="在这里写下素材的正文，支持 Markdown。粘贴或拖入图片会直接以图片形式渲染在光标处。"
            />
          )}
          {!showPreview && kind === '设定素材' && !body.trim() && (
            <button
              type="button"
              className="library-doc-skeleton-inline"
              onClick={insertSettingSkeleton}
            >插入设定骨架</button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PropRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function PropRow({ icon, label, children }: PropRowProps) {
  return (
    <div className="library-prop-row">
      <div className="library-prop-key">
        <span className="library-prop-icon" aria-hidden>{icon}</span>
        <span className="library-prop-label">{label}</span>
      </div>
      <div className="library-prop-value">{children}</div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

function KindRow({ kind, onChange }: { kind: LibraryItemKind; onChange: (k: LibraryItemKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <PropRow icon="◆" label="类型">
      <div className="library-prop-popover-wrap">
        <button
          type="button"
          className="library-prop-chip"
          onClick={() => setOpen((v) => !v)}
          style={{ '--kind-color': KIND_COLOR[kind] } as React.CSSProperties}
        >
          <span className="library-prop-chip-dot" />
          {kind}
        </button>
        {open && (
          <>
            <div className="library-prop-backdrop" onClick={() => setOpen(false)} role="presentation" />
            <div className="library-prop-popover" onClick={(e) => e.stopPropagation()}>
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`library-prop-popover-item${k === kind ? ' is-active' : ''}`}
                  onClick={() => { onChange(k); setOpen(false); }}
                >
                  <span className="library-prop-chip-dot" style={{ background: KIND_COLOR[k] }} />
                  {k}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </PropRow>
  );
}

function CollectionRow({
  collections,
  collectionId,
  onChange,
}: {
  collections: LibraryCollection[];
  collectionId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = collections.find((c) => c.id === collectionId);
  return (
    <PropRow icon="▦" label="集册">
      <div className="library-prop-popover-wrap">
        <button
          type="button"
          className="library-prop-chip library-prop-chip-plain"
          onClick={() => setOpen((v) => !v)}
        >
          {current?.name ?? '（未分配）'}
        </button>
        {open && (
          <>
            <div className="library-prop-backdrop" onClick={() => setOpen(false)} role="presentation" />
            <div className="library-prop-popover" onClick={(e) => e.stopPropagation()}>
              {collections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`library-prop-popover-item${c.id === collectionId ? ' is-active' : ''}`}
                  onClick={() => { onChange(c.id); setOpen(false); }}
                >{c.name}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </PropRow>
  );
}

function TagsRow({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const remove = (t: string) => onChange(tags.filter((x) => x !== t));
  const commit = () => {
    const cleaned = draft.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
    const merged = [...tags];
    for (const t of cleaned) if (!merged.includes(t)) merged.push(t);
    if (cleaned.length > 0) onChange(merged);
    setDraft('');
    setAdding(false);
  };

  return (
    <PropRow icon="#" label="标签">
      <div className="library-tags-row">
        {tags.map((t) => (
          <span key={t} className="library-prop-tag">
            {t}
            <button
              type="button"
              className="library-prop-tag-x"
              onClick={() => remove(t)}
              aria-label={`移除标签 ${t}`}
            >×</button>
          </span>
        ))}
        {adding ? (
          <input
            className="library-prop-tag-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); commit(); }
              else if (e.key === 'Escape') { setDraft(''); setAdding(false); }
              else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
                onChange(tags.slice(0, -1));
              }
            }}
            placeholder="输入后回车"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="library-prop-tag-add"
            onClick={() => setAdding(true)}
          >+ 添加</button>
        )}
      </div>
    </PropRow>
  );
}

function SourceRow({ source, onChange }: { source: string; onChange: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(source);
  const commit = () => {
    onChange(draft.trim());
    setEditing(false);
  };
  return (
    <PropRow icon="↗" label="来源">
      {editing ? (
        <input
          className="library-prop-text-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') { setDraft(source); setEditing(false); }
          }}
          placeholder="书名 / URL / 作者"
          autoFocus
        />
      ) : (
        <button
          type="button"
          className={`library-prop-text${source ? '' : ' is-placeholder'}`}
          onClick={() => { setDraft(source); setEditing(true); }}
        >{source || '点击添加'}</button>
      )}
    </PropRow>
  );
}

function CreatedRow({ createdAt }: { createdAt: string }) {
  return (
    <PropRow icon={<ClockIcon />} label="创建于">
      <span className="library-prop-text library-prop-text-muted">{formatDateTime(createdAt)}</span>
    </PropRow>
  );
}
