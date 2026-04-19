import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AssetRecord, LibraryItem } from '../types';
import { KIND_COLOR } from '../library/constants';

interface RightDockProps {
  items: LibraryItem[];
  activeId: string | null;
  assetMap: Map<string, AssetRecord>;
  width: number;
  onWidthChange: (w: number) => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onClose: () => void;
  onEdit: (id: string) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 720;

export function RightDock({
  items,
  activeId,
  assetMap,
  width,
  onWidthChange,
  onSelectTab,
  onCloseTab,
  onClose,
  onEdit,
}: RightDockProps) {
  const activeItem = useMemo(
    () => items.find((it) => it.id === activeId) ?? items[0] ?? null,
    [items, activeId],
  );

  const previewComponents = useMemo<Components>(() => ({
    img: ({ src, alt, ...rest }) => {
      if (typeof src === 'string' && src.startsWith('asset:')) {
        const id = src.slice('asset:'.length);
        const asset = assetMap.get(id);
        if (asset) return <img src={asset.dataUrl} alt={alt ?? ''} {...rest} />;
        return <span className="right-dock-img-missing">[图片未找到: {id.slice(0, 8)}…]</span>;
      }
      return <img src={src} alt={alt ?? ''} {...rest} />;
    },
  }), [assetMap]);

  const isImageItem = activeItem?.kind === '图像参考';
  const headerAsset = activeItem?.imageAssetId ? assetMap.get(activeItem.imageAssetId) : undefined;

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(0);

  const onHandleMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = startXRef.current - e.clientX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWRef.current + dx));
      onWidthChange(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onWidthChange]);

  return (
    <aside
      className="right-dock"
      role="complementary"
      aria-label="素材查看"
      style={{ width: `${width}px` }}
    >
      <div
        className="right-dock-resizer"
        onMouseDown={onHandleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="拖拽调节宽度"
        title="拖拽调节宽度"
      />

      <header className="right-dock-head">
        <div className="right-dock-tabs" role="tablist">
          {items.map((it) => {
            const isActive = it.id === (activeItem?.id ?? '');
            return (
              <div
                key={it.id}
                role="tab"
                aria-selected={isActive}
                className={`right-dock-tab${isActive ? ' is-active' : ''}`}
                style={{ '--kind-color': KIND_COLOR[it.kind] } as React.CSSProperties}
                onClick={() => onSelectTab(it.id)}
              >
                <span className="right-dock-tab-dot" aria-hidden />
                <span className="right-dock-tab-title">{it.title || '未命名素材'}</span>
                <button
                  type="button"
                  className="right-dock-tab-close"
                  onClick={(e) => { e.stopPropagation(); onCloseTab(it.id); }}
                  aria-label="关闭这个素材"
                  title="关闭"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="right-dock-close"
          onClick={onClose}
          title="隐藏素材面板 (Ctrl+J)"
          aria-label="隐藏素材面板"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </header>

      {activeItem ? (
        <div className="right-dock-body">
          <div className="right-dock-meta">
            <span className="right-dock-kind" style={{ '--kind-color': KIND_COLOR[activeItem.kind] } as React.CSSProperties}>
              <span className="right-dock-kind-dot" aria-hidden />
              {activeItem.kind}
            </span>
            {activeItem.tags.length > 0 && (
              <div className="right-dock-tags">
                {activeItem.tags.slice(0, 6).map((t) => (
                  <span key={t} className="right-dock-tag">#{t}</span>
                ))}
              </div>
            )}
            <button
              type="button"
              className="right-dock-edit"
              onClick={() => onEdit(activeItem.id)}
              title="在素材库中编辑"
            >编辑</button>
          </div>

          <h3 className="right-dock-title">{activeItem.title || '未命名素材'}</h3>

          {isImageItem && headerAsset && (
            <img className="right-dock-image" src={headerAsset.dataUrl} alt={activeItem.title} />
          )}

          <div className="right-dock-md">
            {activeItem.body.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={previewComponents}
                urlTransform={(url) => url}
              >
                {activeItem.body}
              </ReactMarkdown>
            ) : (
              <p className="right-dock-empty-body">（这条素材正文为空）</p>
            )}
          </div>
        </div>
      ) : (
        <div className="right-dock-empty">未挂载素材</div>
      )}
    </aside>
  );
}
