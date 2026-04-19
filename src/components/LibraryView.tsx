import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetRecord, Library, LibraryCollection, LibraryItem, LibraryItemKind } from '../types';
import { formatDateTime } from '../utils';
import { KIND_COLOR, KIND_ORDER } from '../library/constants';
import { LibraryDocumentEditor } from './LibraryDocumentEditor';

const KIND_LABEL: Record<LibraryItemKind | 'all', string> = {
  all: '全部',
  描写片段: '描写片段',
  知识参考: '知识参考',
  设定素材: '设定素材',
  灵感种子: '灵感种子',
  图像参考: '图像参考',
};

export type KindFilter = LibraryItemKind | 'all';

interface LibraryViewProps {
  library: Library;
  assets: AssetRecord[];
  onAddCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  onCreateItem: (collectionId: string, kind: LibraryItemKind) => string;
  onUpdateItem: (id: string, patch: Partial<LibraryItem>, newAsset?: AssetRecord) => void;
  onDeleteItem: (id: string) => void;
  onImportFiles: (files: File[], target?: string | 'all') => Promise<{ imported: number; failed: number }>;
  onImportClipboard: (clip: DataTransfer, target?: string | 'all') => Promise<{ imported: number; failed: number }>;
  onPinToSide: (id: string) => void;
  onClose: () => void;
}

export function LibraryView({
  library,
  assets,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onImportFiles,
  onImportClipboard,
  onPinToSide,
  onClose,
}: LibraryViewProps) {
  const [activeCollectionId, setActiveCollectionId] = useState<string | 'all'>('all');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [collectionMenuFor, setCollectionMenuFor] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCollectionDraft, setNewCollectionDraft] = useState('');
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flashNotice = (text: string) => {
    setImportNotice(text);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setImportNotice(null), 3200);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const assetMap = useMemo(() => {
    const map = new Map<string, AssetRecord>();
    for (const a of assets) map.set(a.id, a);
    return map;
  }, [assets]);

  const collectionMap = useMemo(() => {
    const map = new Map<string, LibraryCollection>();
    for (const c of library.collections) map.set(c.id, c);
    return map;
  }, [library.collections]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.items.filter((item) => {
      if (activeCollectionId !== 'all' && item.collectionId !== activeCollectionId) return false;
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q)
        || item.body.toLowerCase().includes(q)
        || item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [library.items, activeCollectionId, kindFilter, query]);

  const totalByKind = useMemo(() => {
    const scope = activeCollectionId === 'all'
      ? library.items
      : library.items.filter((i) => i.collectionId === activeCollectionId);
    const map: Record<string, number> = { all: scope.length };
    for (const k of KIND_ORDER) map[k] = 0;
    for (const item of scope) map[item.kind] = (map[item.kind] ?? 0) + 1;
    return map;
  }, [library.items, activeCollectionId]);

  const collectionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of library.items) {
      map.set(item.collectionId, (map.get(item.collectionId) ?? 0) + 1);
    }
    return map;
  }, [library.items]);

  const activeItem = activeItemId ? library.items.find((i) => i.id === activeItemId) ?? null : null;

  const startAddCollection = () => {
    setCreatingNew(true);
    setNewCollectionDraft('');
  };

  const commitAddCollection = () => {
    const name = newCollectionDraft.trim();
    if (name) onAddCollection(name);
    setCreatingNew(false);
    setNewCollectionDraft('');
  };

  const cancelAddCollection = () => {
    setCreatingNew(false);
    setNewCollectionDraft('');
  };

  const commitRename = (id: string) => {
    const trimmed = renameDraft.trim();
    if (trimmed) onRenameCollection(id, trimmed);
    setRenamingId(null);
    setRenameDraft('');
  };

  const startRename = (c: LibraryCollection) => {
    setRenamingId(c.id);
    setRenameDraft(c.name);
    setCollectionMenuFor(null);
  };

  const handleCreateItem = (kind: LibraryItemKind) => {
    const collectionId = activeCollectionId !== 'all'
      ? activeCollectionId
      : library.collections[0]?.id;
    if (!collectionId) return;
    const id = onCreateItem(collectionId, kind);
    setActiveItemId(id);
    setNewMenuOpen(false);
  };

  const runImport = async (files: File[]) => {
    if (files.length === 0) return;
    const { imported, failed } = await onImportFiles(files, activeCollectionId);
    const parts: string[] = [];
    if (imported > 0) parts.push(`已导入 ${imported} 条`);
    if (failed > 0) parts.push(`${failed} 条失败`);
    flashNotice(parts.length > 0 ? parts.join(' · ') : '没有可导入的文件');
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (activeItem) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) {
      await runImport(files);
      return;
    }
    const { imported, failed } = await onImportClipboard(e.dataTransfer, activeCollectionId);
    if (imported > 0 || failed > 0) {
      flashNotice(imported > 0 ? `已导入 1 条` : '拖入内容无法识别');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    if (activeItem) return;
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/html')) {
      e.preventDefault();
      setDragging(true);
    }
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    if (activeItem) return;
    const target = e.target as HTMLElement;
    if (target && target.closest('input, textarea, [contenteditable="true"]')) return;
    const { imported, failed } = await onImportClipboard(e.clipboardData, activeCollectionId);
    if (imported > 0) {
      e.preventDefault();
      flashNotice(`已从剪贴板导入 1 条`);
    } else if (failed > 0) {
      flashNotice('剪贴板内容无法识别');
    }
  };

  const onFilesPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await runImport(files);
  };

  if (activeItem) {
    const collection = collectionMap.get(activeItem.collectionId);
    return (
      <div className="library-overlay library-overlay-doc">
        <header className="library-header library-header-doc">
          <button
            type="button"
            className="library-back"
            onClick={() => setActiveItemId(null)}
            aria-label="返回素材库"
          >
            <span aria-hidden>‹</span> 返回
          </button>
          <div className="library-crumb">
            <span>素材库</span>
            {collection && (
              <>
                <span className="library-crumb-sep">/</span>
                <span>{collection.name}</span>
              </>
            )}
          </div>
          <button
            type="button"
            className="library-pin-side"
            onClick={() => { onPinToSide(activeItem.id); onClose(); }}
            title="在写作界面右侧打开这条素材"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z" />
              <path d="M15 3v18" />
            </svg>
            在侧栏打开
          </button>
          <button type="button" className="library-close" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <LibraryDocumentEditor
          key={activeItem.id}
          item={activeItem}
          collections={library.collections}
          assetMap={assetMap}
          onSave={(patch, newAsset) => onUpdateItem(activeItem.id, patch, newAsset)}
          onDelete={() => setDeleteItemId(activeItem.id)}
        />

        {deleteItemId && (
          <ConfirmDialog
            title="删除素材"
            message="这条素材将被移除，相关的图片引用会在下次整理时回收。该操作不可撤销。"
            onCancel={() => setDeleteItemId(null)}
            onConfirm={() => {
              if (activeItemId === deleteItemId) setActiveItemId(null);
              onDeleteItem(deleteItemId);
              setDeleteItemId(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`library-overlay${dragging ? ' is-dragging' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onPaste={onPaste}
    >
      <header className="library-header">
        <div>
          <h2>素材库</h2>
          <p className="library-sub">
            共 {library.items.length} 条，{library.collections.length} 个集册。
            <span className="library-sub-hint">拖入 .md / 图片文件 或直接粘贴即可导入</span>
          </p>
        </div>
        <button type="button" className="library-close" onClick={onClose} aria-label="关闭">×</button>
      </header>

      <div className="library-body">
        <aside className="library-rail">
          <div className="library-rail-head">
            <span>集册</span>
            <button type="button" className="library-rail-add" onClick={startAddCollection} title="新建集册">+</button>
          </div>

          {creatingNew && (
            <input
              className="library-rail-rename library-rail-new-input"
              value={newCollectionDraft}
              onChange={(e) => setNewCollectionDraft(e.target.value)}
              onBlur={commitAddCollection}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAddCollection();
                else if (e.key === 'Escape') cancelAddCollection();
              }}
              placeholder="集册名称"
              autoFocus
            />
          )}

          <button
            type="button"
            className={`library-rail-item${activeCollectionId === 'all' ? ' is-active' : ''}`}
            onClick={() => setActiveCollectionId('all')}
          >
            <span className="library-rail-icon" aria-hidden>▤</span>
            <span className="library-rail-name">全部素材</span>
            <span className="library-rail-count">{library.items.length}</span>
          </button>

          {library.collections.map((c) => (
            <div
              key={c.id}
              className={`library-rail-item${activeCollectionId === c.id ? ' is-active' : ''}`}
              onClick={() => setActiveCollectionId(c.id)}
              onDoubleClick={() => startRename(c)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setActiveCollectionId(c.id);
                else if (e.key === 'F2') { e.preventDefault(); startRename(c); }
              }}
            >
              {renamingId === c.id ? (
                <input
                  className="library-rail-rename"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(c.id);
                    else if (e.key === 'Escape') { setRenamingId(null); setRenameDraft(''); }
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <span className="library-rail-icon" aria-hidden>▦</span>
                  <span className="library-rail-name">{c.name}</span>
                  <span className="library-rail-count">{collectionCounts.get(c.id) ?? 0}</span>
                  <button
                    type="button"
                    className="library-rail-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollectionMenuFor((cur) => (cur === c.id ? null : c.id));
                    }}
                    title="更多"
                    aria-label="集册菜单"
                  >⋯</button>
                  {collectionMenuFor === c.id && (
                    <>
                      <div className="library-rail-menu-backdrop" onClick={() => setCollectionMenuFor(null)} role="presentation" />
                      <div className="library-rail-menu" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => startRename(c)}>重命名</button>
                        <button type="button" className="is-danger" onClick={() => { setCollectionMenuFor(null); setDeleteCollectionId(c.id); }}>删除集册</button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </aside>

        <section className="library-main">
          <div className="library-toolbar">
            <input
              className="library-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题 / 内容 / 标签"
            />

            <div className="library-kind-tabs">
              {(['all', ...KIND_ORDER] as KindFilter[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`library-kind-tab${kindFilter === k ? ' is-active' : ''}`}
                  onClick={() => setKindFilter(k)}
                  style={k !== 'all' ? { '--kind-color': KIND_COLOR[k as LibraryItemKind] } as React.CSSProperties : undefined}
                >
                  {KIND_LABEL[k]} <span className="library-kind-count">{totalByKind[k] ?? 0}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="library-import-btn"
              onClick={() => fileInputRef.current?.click()}
              title="从文件导入（.md / 图片）"
            >
              <span aria-hidden>↥</span> 导入
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.markdown,.mdx,.txt,image/*"
              style={{ display: 'none' }}
              onChange={onFilesPicked}
            />

            <div className="library-new-wrap">
              <button
                type="button"
                className="library-new"
                onClick={() => setNewMenuOpen((v) => !v)}
                disabled={library.collections.length === 0}
                title={library.collections.length === 0 ? '先新建一个集册' : '新建素材'}
              >＋ 新建</button>
              {newMenuOpen && (
                <>
                  <div className="library-new-backdrop" onClick={() => setNewMenuOpen(false)} role="presentation" />
                  <div className="library-new-menu">
                    {KIND_ORDER.map((k) => (
                      <button
                        key={k}
                        type="button"
                        className="library-new-menu-item"
                        onClick={() => handleCreateItem(k)}
                      >
                        <span className="library-kind-dot" style={{ background: KIND_COLOR[k] }} />
                        {KIND_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {importNotice && (
            <div className="library-notice" role="status">{importNotice}</div>
          )}

          {filtered.length === 0 ? (
            <div className="library-empty">
              {library.items.length === 0
                ? '素材库还是空的——点右上角"新建"开始，或者直接拖入 .md / 图片文件。'
                : '当前筛选没有匹配的素材。'}
            </div>
          ) : (
            <div className="library-grid">
              {filtered.map((item) => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  asset={findThumbnailAsset(item, assetMap)}
                  collection={collectionMap.get(item.collectionId)}
                  showCollection={activeCollectionId === 'all'}
                  onOpen={() => setActiveItemId(item.id)}
                  onDelete={() => setDeleteItemId(item.id)}
                  onPinToSide={() => { onPinToSide(item.id); onClose(); }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {dragging && (
        <div className="library-drop-indicator" aria-hidden>
          <div className="library-drop-indicator-inner">
            <div className="library-drop-icon">↧</div>
            <div className="library-drop-text">松开即可导入</div>
            <div className="library-drop-hint">支持 .md / .markdown / .txt / 图片</div>
          </div>
        </div>
      )}

      {deleteItemId && (
        <ConfirmDialog
          title="删除素材"
          message="这条素材将被移除，相关的图片引用会在下次整理时回收。该操作不可撤销。"
          onCancel={() => setDeleteItemId(null)}
          onConfirm={() => {
            if (activeItemId === deleteItemId) setActiveItemId(null);
            onDeleteItem(deleteItemId);
            setDeleteItemId(null);
          }}
        />
      )}

      {deleteCollectionId && (
        <ConfirmDialog
          title="删除集册"
          message={(() => {
            const n = collectionCounts.get(deleteCollectionId) ?? 0;
            return n > 0
              ? `这个集册下还有 ${n} 条素材，一并删除？此操作不可撤销。`
              : '确认删除该集册？';
          })()}
          onCancel={() => setDeleteCollectionId(null)}
          onConfirm={() => {
            onDeleteCollection(deleteCollectionId);
            if (activeCollectionId === deleteCollectionId) setActiveCollectionId('all');
            setDeleteCollectionId(null);
          }}
        />
      )}
    </div>
  );
}

const BODY_ASSET_RE = /\basset:([a-zA-Z0-9-]+)/;

function findThumbnailAsset(item: LibraryItem, assets: Map<string, AssetRecord>): AssetRecord | undefined {
  if (item.imageAssetId) {
    const a = assets.get(item.imageAssetId);
    if (a) return a;
  }
  const m = BODY_ASSET_RE.exec(item.body);
  if (m) return assets.get(m[1]);
  return undefined;
}

interface LibraryCardProps {
  item: LibraryItem;
  asset?: AssetRecord;
  collection?: LibraryCollection;
  showCollection: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onPinToSide: () => void;
}

function LibraryCard({ item, asset, collection, showCollection, onOpen, onDelete, onPinToSide }: LibraryCardProps) {
  const color = KIND_COLOR[item.kind];
  const bodyPreview = item.body.length > 180 ? `${item.body.slice(0, 180)}…` : item.body;
  const isImage = item.kind === '图像参考' && asset;

  return (
    <article className="library-card" style={{ '--kind-color': color } as React.CSSProperties}>
      {isImage && (
        <button type="button" className="library-card-image" onClick={onOpen}>
          <img src={asset.dataUrl} alt={item.title} />
        </button>
      )}

      <div className="library-card-head">
        <span className="library-kind-pill">{item.kind}</span>
        {showCollection && collection && (
          <span className="library-card-collection">· {collection.name}</span>
        )}
        <button
          type="button"
          className="library-card-pin"
          onClick={(e) => { e.stopPropagation(); onPinToSide(); }}
          aria-label="在侧栏打开"
          title="在写作界面右侧打开"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18v18H3z" />
            <path d="M15 3v18" />
          </svg>
        </button>
        <button
          type="button"
          className="library-card-del"
          onClick={onDelete}
          aria-label="删除"
          title="删除"
        >×</button>
      </div>

      <button type="button" className="library-card-body" onClick={onOpen}>
        <h3 className="library-card-title">{item.title || '（未命名）'}</h3>
        {!isImage && bodyPreview && (
          <p className="library-card-preview">{bodyPreview}</p>
        )}
      </button>

      <footer className="library-card-foot">
        {item.tags.length > 0 ? (
          <div className="library-card-tags">
            {item.tags.slice(0, 4).map((t) => (
              <span key={t} className="library-card-tag">#{t}</span>
            ))}
            {item.tags.length > 4 && (
              <span className="library-card-tag library-card-tag-more">+{item.tags.length - 4}</span>
            )}
          </div>
        ) : <span />}
        <span className="library-card-time">{formatDateTime(item.updatedAt)}</span>
      </footer>
    </article>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({ title, message, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="library-confirm-backdrop" onClick={onCancel} role="presentation">
      <div className="library-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="library-confirm-actions">
          <button type="button" onClick={onCancel}>取消</button>
          <button type="button" className="is-danger" onClick={onConfirm}>删除</button>
        </div>
      </div>
    </div>
  );
}
