import { useEffect, useState } from 'react';
import type { ImportEncoding, ImportedBookPreview } from '../workImport';
import { parseNovelFile } from '../workImport';

interface Props {
  onCancel: () => void;
  onConfirm: (preview: ImportedBookPreview, overrides: { title: string; synopsis: string }) => void;
}

const ENCODING_OPTIONS: { value: ImportEncoding; label: string }[] = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'gb18030', label: 'GB18030 / GBK' },
  { value: 'utf-16le', label: 'UTF-16 LE' },
  { value: 'utf-16be', label: 'UTF-16 BE' },
];

function formatInt(n: number): string {
  return n.toLocaleString('zh-CN');
}

export function WorkImportDialog({ onCancel, onConfirm }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportedBookPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideEncoding, setOverrideEncoding] = useState<ImportEncoding | 'auto'>('auto');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSynopsis, setDraftSynopsis] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    parseNovelFile(file, overrideEncoding === 'auto' ? undefined : overrideEncoding)
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
        setDraftTitle(result.title);
        setDraftSynopsis(result.synopsis);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '解析失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, overrideEncoding]);

  const totalWords = preview?.chapters.reduce((s, c) => s + c.wordCount, 0) ?? 0;

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const f = list[0];
    if (!/\.(txt|md|markdown)$/i.test(f.name)) {
      setError('暂仅支持 .txt / .md 文件。');
      return;
    }
    if (f.size > 32 * 1024 * 1024) {
      setError('文件过大（上限 32MB），请先分卷。');
      return;
    }
    setFile(f);
    setOverrideEncoding('auto');
  };

  const confirm = () => {
    if (!preview) return;
    onConfirm(preview, { title: draftTitle.trim() || preview.title, synopsis: draftSynopsis });
  };

  return (
    <div className="works-edit-backdrop" onClick={onCancel}>
      <div className="works-edit-panel work-import-panel" onClick={(e) => e.stopPropagation()}>
        <header className="works-edit-head">
          <h3>导入作品</h3>
          <button className="drawer-close" type="button" onClick={onCancel} aria-label="关闭">✕</button>
        </header>

        <div className="works-edit-body work-import-body">
          {!file && (
            <label
              className={`work-import-drop${dragOver ? ' is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            >
              <input
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="work-import-drop-icon" aria-hidden><BookImportIcon /></div>
              <div className="work-import-drop-title">拖入 .txt / .md 文件</div>
              <div className="work-import-drop-hint">或点击此处选择文件 · 自动识别章节与卷</div>
            </label>
          )}

          {file && (
            <>
              <div className="work-import-file-row">
                <div className="work-import-file-name" title={file.name}>{file.name}</div>
                <button
                  type="button"
                  className="btn-ghost btn-ghost-sm"
                  onClick={() => { setFile(null); setPreview(null); setError(null); }}
                >重选</button>
              </div>

              {error && <p className="works-edit-hint is-error">{error}</p>}
              {loading && <p className="works-edit-hint">正在解析……</p>}

              {preview && (
                <>
                  <div className="work-import-meta-row">
                    <div className="work-import-meta-pill">
                      <span>编码</span>
                      <select
                        value={overrideEncoding}
                        onChange={(e) => setOverrideEncoding(e.target.value as ImportEncoding | 'auto')}
                      >
                        <option value="auto">自动 · {preview.encoding.toUpperCase()}</option>
                        {ENCODING_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="work-import-meta-pill">
                      <span>章节</span>
                      <strong>{formatInt(preview.chapters.length)}</strong>
                    </div>
                    <div className="work-import-meta-pill">
                      <span>卷</span>
                      <strong>{formatInt(preview.volumes.length)}</strong>
                    </div>
                    <div className="work-import-meta-pill">
                      <span>总字数</span>
                      <strong>{formatInt(totalWords)}</strong>
                    </div>
                  </div>

                  {preview.warnings.length > 0 && (
                    <ul className="work-import-warnings">
                      {preview.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                    </ul>
                  )}

                  <label className="works-edit-label">书名</label>
                  <input
                    className="works-edit-input"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />

                  {preview.author && (
                    <>
                      <label className="works-edit-label">作者（检测到）</label>
                      <input className="works-edit-input" value={preview.author} readOnly />
                    </>
                  )}

                  <label className="works-edit-label">简介</label>
                  <textarea
                    className="works-edit-textarea"
                    rows={4}
                    value={draftSynopsis}
                    onChange={(e) => setDraftSynopsis(e.target.value)}
                  />

                  {preview.volumes.length > 0 && (
                    <>
                      <label className="works-edit-label">卷结构</label>
                      <ul className="work-import-volumes">
                        {preview.volumes.map((v, i) => (
                          <li key={i}>
                            <span className="work-import-vol-title">{v.title}</span>
                            <span className="work-import-vol-count">{v.chapterCount} 章</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <label className="works-edit-label">章节预览</label>
                  <ChapterPreview preview={preview} />
                </>
              )}
            </>
          )}
        </div>

        <footer className="works-edit-foot">
          <button type="button" className="btn-ghost" onClick={onCancel}>取消</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!preview || loading || !draftTitle.trim()}
            onClick={confirm}
          >导入 {preview ? `(${formatInt(preview.chapters.length)} 章)` : ''}</button>
        </footer>
      </div>
    </div>
  );
}

function BookImportIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M12 7v6" />
      <path d="M9 10h6" />
    </svg>
  );
}

function ChapterPreview({ preview }: { preview: ImportedBookPreview }) {
  const { chapters } = preview;
  const headCount = Math.min(8, chapters.length);
  const tailCount = chapters.length > 12 ? 3 : 0;
  const head = chapters.slice(0, headCount);
  const tail = tailCount > 0 ? chapters.slice(-tailCount) : [];
  const hiddenCount = chapters.length - head.length - tail.length;

  return (
    <ul className="work-import-chapters">
      {head.map((c, i) => (
        <li key={`h${i}`}>
          <span className="work-import-ch-title">{c.title}</span>
          <span className="work-import-ch-count">{c.wordCount.toLocaleString()} 字</span>
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="work-import-ch-ellipsis">…… 省略 {hiddenCount.toLocaleString()} 章 ……</li>
      )}
      {tail.map((c, i) => (
        <li key={`t${i}`}>
          <span className="work-import-ch-title">{c.title}</span>
          <span className="work-import-ch-count">{c.wordCount.toLocaleString()} 字</span>
        </li>
      ))}
    </ul>
  );
}
