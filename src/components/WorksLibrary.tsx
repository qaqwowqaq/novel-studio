import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetRecord, Work } from '../types';
import { pickImageAsset } from '../assets';
import { formatDateTime, summarizeProgress } from '../utils';
import { WorkImportDialog } from './WorkImportDialog';
import type { ImportedBookPreview } from '../workImport';

interface WorksLibraryProps {
  works: Work[];
  assets: AssetRecord[];
  activeWorkId: string;
  onOpenWork: (workId: string) => void;
  onAddWork: (title: string) => void;
  onImportWork: (preview: ImportedBookPreview, overrides: { title: string; synopsis: string }) => void;
  onUpdateMeta: (workId: string, patch: Partial<Pick<Work, 'title' | 'synopsis' | 'genre' | 'cover'>>) => void;
  onAddAsset: (asset: AssetRecord) => void;
  onDeleteWork: (workId: string) => void;
  onClose: () => void;
}

const COVER_COLORS = [
  '#8e5930', '#c18a5f', '#6b8fb4', '#4a6fa5',
  '#8fa97c', '#4a7c59', '#b57893', '#b5485d',
  '#a07aa8', '#7aa3a3', '#8a7a9b', '#c09256',
];

function coverInitial(work: Work): string {
  if (work.cover?.emoji) return work.cover.emoji;
  return (work.title.trim()[0] ?? '新');
}

function coverBg(work: Work): string {
  return work.cover?.color ?? '#8e5930';
}

function findAsset(assets: AssetRecord[], id: string | undefined): AssetRecord | undefined {
  return id ? assets.find((a) => a.id === id) : undefined;
}

export function WorksLibrary({
  works,
  assets,
  activeWorkId,
  onOpenWork,
  onAddWork,
  onImportWork,
  onUpdateMeta,
  onAddAsset,
  onDeleteWork,
  onClose,
}: WorksLibraryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editingWork = useMemo(
    () => works.find((w) => w.id === editingId) ?? null,
    [works, editingId],
  );
  const confirmWork = useMemo(
    () => works.find((w) => w.id === confirmDeleteId) ?? null,
    [works, confirmDeleteId],
  );

  const newInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isCreating) newInputRef.current?.focus();
  }, [isCreating]);

  const commitCreate = () => {
    const title = newTitle.trim();
    if (!title) {
      setIsCreating(false);
      setNewTitle('');
      return;
    }
    onAddWork(title);
    setNewTitle('');
    setIsCreating(false);
  };

  const openEdit = (work: Work) => {
    setEditingId(work.id);
    setDraftTitle(work.title);
  };

  const commitEditTitle = () => {
    if (!editingWork) return;
    const next = draftTitle.trim();
    if (next && next !== editingWork.title) {
      onUpdateMeta(editingWork.id, { title: next });
    } else {
      setDraftTitle(editingWork.title);
    }
  };

  const confirmDelete = () => {
    if (!confirmWork) return;
    if (deleteInput.trim() !== confirmWork.title) return;
    if (works.length <= 1) return;
    onDeleteWork(confirmWork.id);
    setConfirmDeleteId(null);
    setDeleteInput('');
  };

  return (
    <section className="works-overlay" role="dialog" aria-modal="true" aria-label="作品库">
      <header className="works-header">
        <div>
          <h2>作品库</h2>
          <p className="works-sub">管理所有作品，编辑元数据或删除。</p>
        </div>
        <button className="drawer-close" type="button" onClick={onClose} aria-label="关闭">✕</button>
      </header>

      <div className="works-grid">
        {works.map((work) => {
          const isActive = work.id === activeWorkId;
          return (
            <article
              key={work.id}
              className={`work-card${isActive ? ' is-active' : ''}`}
            >
              <button
                className="work-card-surface"
                type="button"
                onClick={() => onOpenWork(work.id)}
                title="打开这部作品"
              >
                <WorkCoverDisplay work={work} asset={findAsset(assets, work.cover?.imageAssetId)} size="sm" />
                <div className="work-card-body">
                  <div className="work-card-title-row">
                    <h3 className="work-card-title">{work.title}</h3>
                    {isActive && <span className="work-card-badge">当前</span>}
                  </div>
                  {work.genre && <div className="work-card-genre">{work.genre}</div>}
                  <p className="work-card-synopsis">
                    {work.synopsis || '（未填写简介）'}
                  </p>
                  <div className="work-card-meta">
                    <span>{summarizeProgress(work)}</span>
                    <span className="work-card-meta-dot">·</span>
                    <span>更新 {formatDateTime(work.updatedAt)}</span>
                  </div>
                </div>
              </button>
              <div className="work-card-actions">
                <button
                  type="button"
                  className="work-card-action"
                  onClick={() => openEdit(work)}
                  title="编辑元数据"
                >编辑</button>
                <button
                  type="button"
                  className="work-card-action is-danger"
                  disabled={works.length <= 1}
                  onClick={() => { setConfirmDeleteId(work.id); setDeleteInput(''); }}
                  title={works.length <= 1 ? '至少保留 1 部作品' : '删除作品'}
                >删除</button>
              </div>
            </article>
          );
        })}

        {isCreating ? (
          <article className="work-card work-card-new is-editing">
            <input
              ref={newInputRef}
              className="work-card-new-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate();
                else if (e.key === 'Escape') { setIsCreating(false); setNewTitle(''); }
              }}
              onBlur={commitCreate}
              placeholder="作品名，例：长夜未央"
            />
            <p className="work-card-new-hint">回车创建 · Esc 取消</p>
          </article>
        ) : (
          <button
            className="work-card work-card-new"
            type="button"
            onClick={() => setIsCreating(true)}
          >
            <div className="work-card-new-plus">＋</div>
            <div className="work-card-new-label">新作品</div>
          </button>
        )}

        <button
          className="work-card work-card-new work-card-import"
          type="button"
          onClick={() => setImportOpen(true)}
          title="从外部 .txt / .md 导入整本小说"
        >
          <div className="work-card-new-plus" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3" />
              <path d="m7 8 5-5 5 5" />
              <path d="M5 21h14" />
              <path d="M5 17h14" />
            </svg>
          </div>
          <div className="work-card-new-label">导入作品</div>
        </button>
      </div>

      {editingWork && (
        <div className="works-edit-backdrop" onClick={() => { commitEditTitle(); setEditingId(null); }}>
          <div className="works-edit-panel" onClick={(e) => e.stopPropagation()}>
            <header className="works-edit-head">
              <h3>编辑作品</h3>
              <button className="drawer-close" type="button" onClick={() => { commitEditTitle(); setEditingId(null); }}>✕</button>
            </header>

            <div className="works-edit-body">
              <div className="works-edit-cover-row">
                <WorkCoverDisplay
                  work={editingWork}
                  asset={findAsset(assets, editingWork.cover?.imageAssetId)}
                  size="lg"
                />
                <div className="works-edit-cover-form">
                  <div className="works-edit-cover-actions">
                    <button
                      type="button"
                      className="btn-ghost btn-ghost-sm"
                      disabled={isUploading}
                      onClick={async () => {
                        setUploadError(null);
                        setIsUploading(true);
                        try {
                          const asset = await pickImageAsset({ maxEdge: 600, quality: 0.85 });
                          if (asset) {
                            onAddAsset(asset);
                            onUpdateMeta(editingWork.id, { cover: { imageAssetId: asset.id } });
                          }
                        } catch (err) {
                          setUploadError(err instanceof Error ? err.message : '上传失败');
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                    >{editingWork.cover?.imageAssetId ? '更换图片' : '上传图片'}</button>
                    {editingWork.cover?.imageAssetId && (
                      <button
                        type="button"
                        className="btn-ghost btn-ghost-sm"
                        onClick={() => onUpdateMeta(editingWork.id, { cover: { imageAssetId: undefined } })}
                      >移除图片</button>
                    )}
                  </div>
                  {uploadError && <p className="works-edit-hint is-error">{uploadError}</p>}
                  <label className="works-edit-label">封面字符（无图时显示）</label>
                  <input
                    className="works-edit-input works-edit-input-compact"
                    maxLength={2}
                    value={editingWork.cover?.emoji ?? ''}
                    onChange={(e) => onUpdateMeta(editingWork.id, { cover: { emoji: e.target.value } })}
                    placeholder="如：刀、雾、⚔、🌙"
                  />
                  <label className="works-edit-label">封面颜色</label>
                  <div className="works-edit-palette">
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`palette-swatch${editingWork.cover?.color === c ? ' is-active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => onUpdateMeta(editingWork.id, { cover: { color: c } })}
                        aria-label={`颜色 ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <label className="works-edit-label">标题</label>
              <input
                className="works-edit-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitEditTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { commitEditTitle(); (e.target as HTMLInputElement).blur(); }
                }}
              />

              <label className="works-edit-label">类型</label>
              <input
                className="works-edit-input"
                value={editingWork.genre}
                onChange={(e) => onUpdateMeta(editingWork.id, { genre: e.target.value })}
                placeholder="如：东方幻想 / 悬疑 / 现代都市"
              />

              <label className="works-edit-label">简介</label>
              <textarea
                className="works-edit-textarea"
                rows={4}
                value={editingWork.synopsis}
                onChange={(e) => onUpdateMeta(editingWork.id, { synopsis: e.target.value })}
                placeholder="一两句话描述这部作品的主线或氛围"
              />
            </div>

            <footer className="works-edit-foot">
              <button type="button" className="btn-ghost" onClick={() => { commitEditTitle(); setEditingId(null); }}>完成</button>
            </footer>
          </div>
        </div>
      )}

      {importOpen && (
        <WorkImportDialog
          onCancel={() => setImportOpen(false)}
          onConfirm={(preview, overrides) => {
            onImportWork(preview, overrides);
            setImportOpen(false);
          }}
        />
      )}

      {confirmWork && (
        <div className="works-edit-backdrop" onClick={() => { setConfirmDeleteId(null); setDeleteInput(''); }}>
          <div className="works-edit-panel works-edit-panel-sm" onClick={(e) => e.stopPropagation()}>
            <header className="works-edit-head">
              <h3>删除作品</h3>
            </header>
            <div className="works-edit-body">
              <p className="works-delete-warning">
                作品 <strong>《{confirmWork.title}》</strong> 的所有章节、设定、灵感、对话、快照都会被永久删除，且无法恢复。
              </p>
              <label className="works-edit-label">请输入完整书名以确认</label>
              <input
                className="works-edit-input"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={confirmWork.title}
                autoFocus
              />
            </div>
            <footer className="works-edit-foot">
              <button type="button" className="btn-ghost" onClick={() => { setConfirmDeleteId(null); setDeleteInput(''); }}>取消</button>
              <button
                type="button"
                className="btn-danger"
                disabled={deleteInput.trim() !== confirmWork.title}
                onClick={confirmDelete}
              >永久删除</button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

function WorkCoverDisplay({
  work,
  asset,
  size,
}: {
  work: Work;
  asset: AssetRecord | undefined;
  size: 'sm' | 'lg';
}) {
  const cls = `work-cover${size === 'lg' ? ' work-cover-lg' : ''}`;
  if (asset) {
    return (
      <div className={`${cls} work-cover-image`} aria-label={work.title}>
        <img src={asset.dataUrl} alt={work.title} />
        <span className="work-cover-spine" aria-hidden />
      </div>
    );
  }
  return (
    <div className={cls} style={{ backgroundColor: coverBg(work) }}>
      <span className="work-cover-char">{coverInitial(work)}</span>
    </div>
  );
}
