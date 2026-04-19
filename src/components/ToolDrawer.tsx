import { useMemo, useState } from 'react';
import type { AiProviderStatus, AssetRecord, Chapter, Foreshadow, ForeshadowState, LoreItem, LoreType, PanelTab, Work } from '../types';
import { AiChat } from './AiChat';
import { ForeshadowEditor } from './ForeshadowEditor';
import { LoreEditor } from './LoreEditor';

interface ToolDrawerProps {
  work: Work;
  chapter: Chapter;
  tab: PanelTab;
  assets: AssetRecord[];
  initialEditLoreId?: string | null;
  initialEditForeshadowId?: string | null;
  initialIdeaDraft?: string;
  initialAiDraft?: string;
  providerStatus: AiProviderStatus;
  isAiSending: boolean;
  streamingAiContent?: string;
  onTabChange: (tab: PanelTab) => void;
  onUpdateOutline: (outline: string) => void;
  onUpdateSummary: (summary: string) => void;
  onUpdateSynopsis: (synopsis: string) => void;
  onCreateBlankLore: (type?: LoreType) => string;
  onUpdateLore: (loreId: string, patch: Partial<Pick<LoreItem, 'name' | 'description' | 'type' | 'imageAssetId' | 'aliases' | 'attributes' | 'tags'>>) => void;
  onDeleteLore: (loreId: string) => void;
  onCreateBlankForeshadow: () => string;
  onUpdateForeshadow: (foreshadowId: string, patch: Partial<Foreshadow>) => void;
  onDeleteForeshadow: (foreshadowId: string) => void;
  onAddAsset: (asset: AssetRecord) => void;
  onAddIdea: (content: string) => void;
  onUpdateIdea: (ideaId: string, patch: { content: string }) => void;
  onDeleteIdea: (ideaId: string) => void;
  onSendAiMessage: (content: string) => Promise<void>;
  onCancelAiMessage: () => void;
  onApplyProposal: (msgId: string, proposalId: string) => void;
  onRejectProposal: (msgId: string, proposalId: string) => void;
  onOpenGraph: () => void;
  onOpenAiSettings: () => void;
  onClose: () => void;
}

const TABS: Array<{ id: PanelTab; label: string }> = [
  { id: 'outline', label: '大纲' },
  { id: 'lore', label: '设定' },
  { id: 'foreshadow', label: '伏笔' },
  { id: 'ideas', label: '灵感' },
  { id: 'ai', label: 'AI' },
];

const LORE_TYPES: LoreType[] = ['人物', '地点', '势力', '规则', '线索'];
type LoreFilter = 'all' | LoreType;
type ForeshadowFilter = 'all' | ForeshadowState;

const FORESHADOW_FILTERS: Array<{ key: ForeshadowFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'planted', label: '埋下' },
  { key: 'echoed', label: '回响' },
  { key: 'paid_off', label: '回收' },
];

const FORESHADOW_STATE_LABEL: Record<ForeshadowState, string> = {
  planted: '埋下',
  echoed: '回响',
  paid_off: '回收',
};

const OUTLINE_TEMPLATE = `本章目标：
-
-

关键场景：
-

核心冲突：

伏笔 / 回收：

结尾钩子：
`;

export function ToolDrawer({
  work,
  chapter,
  tab,
  assets,
  initialEditLoreId = null,
  initialEditForeshadowId = null,
  initialIdeaDraft = '',
  initialAiDraft = '',
  providerStatus,
  isAiSending,
  streamingAiContent = '',
  onTabChange,
  onUpdateOutline,
  onUpdateSummary,
  onUpdateSynopsis,
  onCreateBlankLore,
  onUpdateLore,
  onDeleteLore,
  onCreateBlankForeshadow,
  onUpdateForeshadow,
  onDeleteForeshadow,
  onAddAsset,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
  onSendAiMessage,
  onCancelAiMessage,
  onApplyProposal,
  onRejectProposal,
  onOpenGraph,
  onOpenAiSettings,
  onClose,
}: ToolDrawerProps) {
  const [loreFilter, setLoreFilter] = useState<LoreFilter>('all');
  const [loreSearch, setLoreSearch] = useState('');
  const [foreshadowFilter, setForeshadowFilter] = useState<ForeshadowFilter>('all');
  const [foreshadowSearch, setForeshadowSearch] = useState('');
  const [ideaContent, setIdeaContent] = useState(() => initialIdeaDraft);
  const [ideaSearch, setIdeaSearch] = useState('');
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editIdeaDraft, setEditIdeaDraft] = useState('');
  const [confirmingDeleteIdeaId, setConfirmingDeleteIdeaId] = useState<string | null>(null);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [editingLoreId, setEditingLoreId] = useState<string | null>(() => initialEditLoreId);
  const [editingForeshadowId, setEditingForeshadowId] = useState<string | null>(() => initialEditForeshadowId);

  const editingLore = useMemo(
    () => work.lore.find((l) => l.id === editingLoreId) ?? null,
    [work.lore, editingLoreId],
  );

  const editingForeshadow = useMemo(
    () => (work.foreshadows ?? []).find((f) => f.id === editingForeshadowId) ?? null,
    [work.foreshadows, editingForeshadowId],
  );

  const filteredForeshadows = useMemo(() => {
    const list = work.foreshadows ?? [];
    const q = foreshadowSearch.trim().toLowerCase();
    return list.filter((f) => {
      if (foreshadowFilter !== 'all' && f.state !== foreshadowFilter) return false;
      if (!q) return true;
      if (f.title.toLowerCase().includes(q)) return true;
      if (f.description.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [work.foreshadows, foreshadowFilter, foreshadowSearch]);

  const foreshadowCountByState: Record<ForeshadowState | 'all', number> = useMemo(() => {
    const list = work.foreshadows ?? [];
    return {
      all: list.length,
      planted: list.filter((f) => f.state === 'planted').length,
      echoed: list.filter((f) => f.state === 'echoed').length,
      paid_off: list.filter((f) => f.state === 'paid_off').length,
    };
  }, [work.foreshadows]);

  const chapterTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of work.chapters) m.set(c.id, c.title);
    return m;
  }, [work.chapters]);

  const { prevChapter, nextChapter } = useMemo(() => {
    const idx = work.chapters.findIndex((c) => c.id === chapter.id);
    if (idx < 0) return { prevChapter: null, nextChapter: null };
    return {
      prevChapter: idx > 0 ? work.chapters[idx - 1] : null,
      nextChapter: idx < work.chapters.length - 1 ? work.chapters[idx + 1] : null,
    };
  }, [work.chapters, chapter.id]);

  const filteredLore = useMemo(() => {
    const q = loreSearch.trim().toLowerCase();
    return work.lore.filter((l) => {
      if (loreFilter !== 'all' && l.type !== loreFilter) return false;
      if (!q) return true;
      if (l.name.toLowerCase().includes(q)) return true;
      if (l.description.toLowerCase().includes(q)) return true;
      if (l.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [work.lore, loreFilter, loreSearch]);

  const filteredIdeas = useMemo(() => {
    const q = ideaSearch.trim().toLowerCase();
    if (!q) return work.ideas;
    return work.ideas.filter((i) =>
      i.content.toLowerCase().includes(q) || i.linkHint.toLowerCase().includes(q),
    );
  }, [work.ideas, ideaSearch]);

  const handleCreateLore = () => {
    const defaultType = loreFilter === 'all' ? '人物' : loreFilter;
    const id = onCreateBlankLore(defaultType);
    if (id) setEditingLoreId(id);
  };

  const handleCreateForeshadow = () => {
    const id = onCreateBlankForeshadow();
    if (id) setEditingForeshadowId(id);
  };

  const handleAddIdea = () => {
    if (!ideaContent.trim()) return;
    onAddIdea(ideaContent.trim());
    setIdeaContent('');
  };

  const handleIdeaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddIdea();
    }
  };

  return (
    <aside className="drawer drawer-right" role="dialog" aria-modal="true" aria-label="写作工具">
      <div className="drawer-header">
        <div className="drawer-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`drawer-tab${tab === t.id ? ' is-active' : ''}`}
              type="button"
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
      </div>

      <div className="drawer-body">
        {tab === 'outline' && (
          <div className="tool-panel">
            <div className="tool-section tool-section-primary">
              <div className="tool-heading-row">
                <span className="tool-heading">本章大纲</span>
                <span className="tool-heading-meta">{chapter.title}</span>
              </div>
              <textarea
                className="tool-textarea tool-textarea-tall"
                value={chapter.outline}
                onChange={(e) => onUpdateOutline(e.target.value)}
                placeholder="写下本章的结构和目标..."
                spellCheck={false}
              />
              {!chapter.outline.trim() && (
                <div className="tool-template-hint">
                  <span>空白不知道从哪写起？</span>
                  <button
                    type="button"
                    className="tool-link-btn"
                    onClick={() => onUpdateOutline(OUTLINE_TEMPLATE)}
                  >插入模板</button>
                </div>
              )}
            </div>
            <div className="tool-section">
              <label className="tool-label">本章摘要</label>
              <textarea
                className="tool-textarea compact"
                value={chapter.summary}
                onChange={(e) => onUpdateSummary(e.target.value)}
                placeholder="一两句话概括本章内容..."
                spellCheck={false}
              />
            </div>
            {prevChapter && (
              <div className="tool-section">
                <div className="tool-recap-head">
                  <span className="tool-label">上一章摘要</span>
                  <span className="tool-heading-meta">{prevChapter.title}</span>
                </div>
                <div className="tool-recap-body">
                  {prevChapter.summary.trim() || <span className="tool-recap-empty">（未填写摘要）</span>}
                </div>
              </div>
            )}
            {nextChapter && (
              <div className="tool-section">
                <div className="tool-recap-head">
                  <span className="tool-label">下一章摘要</span>
                  <span className="tool-heading-meta">{nextChapter.title}</span>
                </div>
                <div className="tool-recap-body">
                  {nextChapter.summary.trim() || <span className="tool-recap-empty">（未填写摘要）</span>}
                </div>
              </div>
            )}
            <div className="tool-accordion">
              <button
                type="button"
                className={`tool-accordion-head${synopsisOpen ? ' is-open' : ''}`}
                onClick={() => setSynopsisOpen((v) => !v)}
              >
                <span className="tree-caret">▾</span>
                <span className="tool-accordion-label">作品简介</span>
                {!synopsisOpen && work.synopsis && (
                  <span className="tool-accordion-preview">{work.synopsis}</span>
                )}
              </button>
              {synopsisOpen && (
                <div className="tool-accordion-body">
                  <textarea
                    className="tool-textarea compact"
                    value={work.synopsis}
                    onChange={(e) => onUpdateSynopsis(e.target.value)}
                    placeholder="作品主线 / 氛围 / 基调的一两句话..."
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'lore' && (
          <div className="tool-panel">
            <div className="tool-toolbar">
              <input
                className="tool-search"
                value={loreSearch}
                onChange={(e) => setLoreSearch(e.target.value)}
                placeholder="搜索名称、简介、别号..."
              />
              <button
                type="button"
                className="tool-add-btn"
                onClick={handleCreateLore}
                title="新建设定"
                aria-label="新建设定"
              >＋</button>
            </div>
            <div className="tool-filter-row">
              <button
                type="button"
                className={`tool-filter-chip${loreFilter === 'all' ? ' is-active' : ''}`}
                onClick={() => setLoreFilter('all')}
              >全部 {work.lore.length}</button>
              {LORE_TYPES.map((t) => {
                const count = work.lore.filter((l) => l.type === t).length;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`tool-filter-chip${loreFilter === t ? ' is-active' : ''}`}
                    onClick={() => setLoreFilter(t)}
                  >{t} {count}</button>
                );
              })}
              <span className="tool-filter-spacer" />
              <button type="button" className="tool-link-btn" onClick={onOpenGraph}>关系图谱</button>
            </div>

            <div className="tool-list">
              {filteredLore.length === 0 ? (
                <div className="tool-empty">
                  {work.lore.length === 0
                    ? '还没有设定。点右上角＋新建第一张卡片'
                    : '没有符合条件的条目'}
                </div>
              ) : (
                filteredLore.map((item) => {
                  const asset = item.imageAssetId ? assets.find((a) => a.id === item.imageAssetId) : undefined;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="lore-card"
                      onClick={() => setEditingLoreId(item.id)}
                    >
                      <div className={`lore-card-thumb${asset ? ' has-image' : ''}`}>
                        {asset ? (
                          <img src={asset.dataUrl} alt={item.name} />
                        ) : (
                          <span>{(item.name.trim()[0] ?? '？')}</span>
                        )}
                      </div>
                      <div className="lore-card-body">
                        <div className="lore-card-title-row">
                          <strong className="lore-card-name">{item.name || '未命名'}</strong>
                          <span className="lore-type">{item.type}</span>
                        </div>
                        {item.attributes?.role && (
                          <span className="lore-card-role">{item.attributes.role}</span>
                        )}
                        <p className="lore-card-desc">{item.description || '（未填写简介）'}</p>
                        {(item.aliases && item.aliases.length > 0) && (
                          <div className="lore-card-aliases">
                            {item.aliases.slice(0, 3).map((a) => (
                              <span key={a} className="lore-card-alias">{a}</span>
                            ))}
                            {item.aliases.length > 3 && (
                              <span className="lore-card-alias-more">+{item.aliases.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === 'foreshadow' && (
          <div className="tool-panel">
            <div className="tool-toolbar">
              <input
                className="tool-search"
                value={foreshadowSearch}
                onChange={(e) => setForeshadowSearch(e.target.value)}
                placeholder="搜索伏笔标题 / 描述..."
              />
              <button
                type="button"
                className="tool-add-btn"
                onClick={handleCreateForeshadow}
                title="新建伏笔"
                aria-label="新建伏笔"
              >＋</button>
            </div>
            <div className="tool-filter-row">
              {FORESHADOW_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`tool-filter-chip${foreshadowFilter === f.key ? ' is-active' : ''}`}
                  onClick={() => setForeshadowFilter(f.key)}
                >{f.label} {foreshadowCountByState[f.key]}</button>
              ))}
            </div>

            <div className="tool-list">
              {filteredForeshadows.length === 0 ? (
                <div className="tool-empty">
                  {(work.foreshadows ?? []).length === 0
                    ? '还没有伏笔。点右上角＋记下第一条'
                    : '没有符合条件的伏笔'}
                </div>
              ) : (
                filteredForeshadows.map((f) => {
                  const plantedCh = f.planted?.anchor?.chapterId;
                  const echoedCh = f.echoed?.anchor?.chapterId;
                  const paidOffCh = f.paidOff?.anchor?.chapterId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className="foreshadow-card"
                      onClick={() => setEditingForeshadowId(f.id)}
                    >
                      <div className="foreshadow-card-head">
                        <strong className="foreshadow-card-title">{f.title || '未命名伏笔'}</strong>
                        <span className={`foreshadow-state-badge is-${f.state}`}>
                          <span className={`foreshadow-state-dot is-${f.state}`} />
                          {FORESHADOW_STATE_LABEL[f.state]}
                        </span>
                      </div>
                      <p className="foreshadow-card-desc">{f.description || '（未填写描述）'}</p>
                      <div className="foreshadow-card-trail">
                        <span className={`foreshadow-trail-node is-planted${f.planted ? ' is-filled' : ''}`}>
                          <span className="foreshadow-trail-dot" />
                          埋 {plantedCh ? chapterTitleById.get(plantedCh)?.replace(/^第/, '') : '—'}
                        </span>
                        <span className="foreshadow-trail-line" />
                        <span className={`foreshadow-trail-node is-echoed${f.echoed ? ' is-filled' : ''}`}>
                          <span className="foreshadow-trail-dot" />
                          响 {echoedCh ? chapterTitleById.get(echoedCh)?.replace(/^第/, '') : '—'}
                        </span>
                        <span className="foreshadow-trail-line" />
                        <span className={`foreshadow-trail-node is-paid_off${f.paidOff ? ' is-filled' : ''}`}>
                          <span className="foreshadow-trail-dot" />
                          收 {paidOffCh ? chapterTitleById.get(paidOffCh)?.replace(/^第/, '') : '—'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === 'ideas' && (
          <div className="tool-panel">
            <div className="tool-capture">
              <textarea
                className="tool-capture-input"
                value={ideaContent}
                onChange={(e) => setIdeaContent(e.target.value)}
                onKeyDown={handleIdeaKeyDown}
                placeholder="一句对白、一个转折、一个伏笔...  ⌘Enter 快速保存"
                spellCheck={false}
              />
              <div className="tool-capture-foot">
                <span className="tool-capture-hint">会关联当前章节：{chapter.title}</span>
                <button
                  type="button"
                  className="tool-capture-btn"
                  onClick={handleAddIdea}
                  disabled={!ideaContent.trim()}
                >收进灵感箱</button>
              </div>
            </div>

            {work.ideas.length > 0 && (
              <div className="tool-toolbar tool-toolbar-slim">
                <input
                  className="tool-search"
                  value={ideaSearch}
                  onChange={(e) => setIdeaSearch(e.target.value)}
                  placeholder={`搜索 ${work.ideas.length} 条灵感`}
                />
              </div>
            )}

            <div className="tool-list">
              {work.ideas.length === 0 ? (
                <div className="tool-empty">还没有灵感。上面随手写一句，⌘Enter 就存了</div>
              ) : filteredIdeas.length === 0 ? (
                <div className="tool-empty">没有匹配的灵感</div>
              ) : (
                filteredIdeas.map((idea) => {
                  const anchorExcerpt = idea.anchor?.excerpt?.replace(/\s+/g, ' ').trim();
                  const isEditing = editingIdeaId === idea.id;
                  const isConfirmingDelete = confirmingDeleteIdeaId === idea.id;
                  const commitEdit = () => {
                    const next = editIdeaDraft.trim();
                    if (next && next !== idea.content) onUpdateIdea(idea.id, { content: next });
                    setEditingIdeaId(null);
                  };
                  const cancelEdit = () => {
                    setEditingIdeaId(null);
                    setEditIdeaDraft('');
                  };
                  const startEdit = () => {
                    setEditingIdeaId(idea.id);
                    setEditIdeaDraft(idea.content);
                    setConfirmingDeleteIdeaId(null);
                  };
                  return (
                    <div key={idea.id} className={`idea-card${isEditing ? ' is-editing' : ''}`}>
                      <div className="idea-card-head">
                        <span className="idea-hint">{idea.linkHint}</span>
                        <span className="idea-card-actions">
                          {isConfirmingDelete ? (
                            <>
                              <button type="button" className="idea-card-action" onClick={() => setConfirmingDeleteIdeaId(null)}>取消</button>
                              <button type="button" className="idea-card-action is-danger" onClick={() => { onDeleteIdea(idea.id); setConfirmingDeleteIdeaId(null); }}>确定删除</button>
                            </>
                          ) : isEditing ? (
                            <>
                              <button type="button" className="idea-card-action" onMouseDown={(e) => e.preventDefault()} onClick={cancelEdit}>取消</button>
                              <button type="button" className="idea-card-action is-primary" onMouseDown={(e) => e.preventDefault()} onClick={commitEdit}>保存</button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="idea-card-action" onClick={startEdit}>编辑</button>
                              <button type="button" className="idea-card-action is-subtle" onClick={() => setConfirmingDeleteIdeaId(idea.id)}>删除</button>
                            </>
                          )}
                        </span>
                      </div>
                      {isEditing ? (
                        <textarea
                          className="idea-edit-input"
                          value={editIdeaDraft}
                          onChange={(e) => setEditIdeaDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                            else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                          }}
                          autoFocus
                          spellCheck={false}
                        />
                      ) : (
                        <p>{idea.content}</p>
                      )}
                      {anchorExcerpt && !isEditing && (
                        <div className="idea-anchor">⚑ 「{anchorExcerpt}」</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <AiChat
            key={initialAiDraft || 'ai-chat'}
            work={work}
            chapter={chapter}
            messages={work.aiMessages}
            providerStatus={providerStatus}
            isSending={isAiSending}
            streamingContent={streamingAiContent}
            initialInput={initialAiDraft}
            onSend={onSendAiMessage}
            onCancel={onCancelAiMessage}
            onApplyProposal={onApplyProposal}
            onRejectProposal={onRejectProposal}
            onOpenSettings={onOpenAiSettings}
          />
        )}
      </div>

      {editingLore && (
        <LoreEditor
          lore={editingLore}
          assets={assets}
          onChange={(patch) => onUpdateLore(editingLore.id, patch)}
          onAddAsset={onAddAsset}
          onDelete={() => onDeleteLore(editingLore.id)}
          onClose={() => setEditingLoreId(null)}
        />
      )}

      {editingForeshadow && (
        <ForeshadowEditor
          foreshadow={editingForeshadow}
          chapters={work.chapters}
          lore={work.lore}
          onChange={(patch) => onUpdateForeshadow(editingForeshadow.id, patch)}
          onDelete={() => onDeleteForeshadow(editingForeshadow.id)}
          onClose={() => setEditingForeshadowId(null)}
        />
      )}
    </aside>
  );
}
