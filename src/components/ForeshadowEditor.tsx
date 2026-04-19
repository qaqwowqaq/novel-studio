import { useEffect, useState } from 'react';
import type { Anchor, Chapter, Foreshadow, ForeshadowStageRecord, ForeshadowState, LoreItem } from '../types';

interface ForeshadowEditorProps {
  foreshadow: Foreshadow;
  chapters: Chapter[];
  lore: LoreItem[];
  onChange: (patch: Partial<Foreshadow>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const STATE_META: Array<{ key: ForeshadowState; label: string; stageKey: 'planted' | 'echoed' | 'paidOff'; accent: string; hint: string }> = [
  { key: 'planted', label: '埋下', stageKey: 'planted', accent: 'planted', hint: '第一次在正文里"埋"下这个伏笔' },
  { key: 'echoed', label: '回响', stageKey: 'echoed', accent: 'echoed', hint: '中段通过暗示 / 旁敲 / 误导让读者感觉"有东西"' },
  { key: 'paid_off', label: '回收', stageKey: 'paidOff', accent: 'paid_off', hint: '揭开真相 / 翻盘 / 引爆' },
];

function makeAnchor(chapterId: string): Anchor {
  return {
    chapterId,
    excerpt: '',
    contextBefore: '',
    contextAfter: '',
    createdAt: new Date().toISOString(),
  };
}

export function ForeshadowEditor({ foreshadow, chapters, lore, onChange, onDelete, onClose }: ForeshadowEditorProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const updateStage = (stageKey: 'planted' | 'echoed' | 'paidOff', patch: Partial<ForeshadowStageRecord>) => {
    const current = foreshadow[stageKey] ?? { note: '' };
    onChange({ [stageKey]: { ...current, ...patch } } as Partial<Foreshadow>);
  };

  const clearStage = (stageKey: 'planted' | 'echoed' | 'paidOff') => {
    onChange({ [stageKey]: undefined } as Partial<Foreshadow>);
  };

  const characterOrFactionLore = lore.filter((l) => l.type !== '规则');

  const toggleLink = (loreId: string) => {
    const existing = foreshadow.linkedLoreIds ?? [];
    const next = existing.includes(loreId)
      ? existing.filter((x) => x !== loreId)
      : [...existing, loreId];
    onChange({ linkedLoreIds: next });
  };

  return (
    <div className="lore-editor-backdrop" onClick={onClose} role="presentation">
      <div className="lore-editor-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="伏笔卡">
        <header className="lore-editor-head">
          <h3 className="lore-editor-title">伏笔卡</h3>
          <button className="drawer-close" type="button" onClick={onClose} aria-label="关闭">✕</button>
        </header>

        <div className="lore-editor-body foreshadow-editor-body">
          <div className="foreshadow-editor-main">
            <label className="works-edit-label">名称</label>
            <input
              className="works-edit-input"
              value={foreshadow.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="给这个伏笔起个短名字，如：沈照的旧氅"
              autoFocus
            />

            <label className="works-edit-label">描述</label>
            <textarea
              className="works-edit-textarea"
              rows={2}
              value={foreshadow.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="这个伏笔是什么？为什么值得追踪？"
            />

            <label className="works-edit-label">当前阶段</label>
            <div className="foreshadow-state-row">
              {STATE_META.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`foreshadow-state-chip is-${m.accent}${foreshadow.state === m.key ? ' is-active' : ''}`}
                  onClick={() => onChange({ state: m.key })}
                  title={m.hint}
                >
                  <span className={`foreshadow-state-dot is-${m.accent}`} />
                  {m.label}
                </button>
              ))}
            </div>

            {STATE_META.map((m) => {
              const stage = foreshadow[m.stageKey];
              const isEmpty = !stage;
              return (
                <section key={m.key} className={`foreshadow-stage${isEmpty ? ' is-empty' : ''}`}>
                  <div className="foreshadow-stage-head">
                    <span className={`foreshadow-state-dot is-${m.accent}`} />
                    <span className="foreshadow-stage-label">{m.label}</span>
                    <span className="foreshadow-stage-hint">{m.hint}</span>
                    <span className="foreshadow-stage-spacer" />
                    {isEmpty ? (
                      <button
                        type="button"
                        className="btn-ghost btn-ghost-sm"
                        onClick={() => updateStage(m.stageKey, { note: '', at: new Date().toISOString() })}
                      >添加</button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost btn-ghost-sm is-subtle"
                        onClick={() => clearStage(m.stageKey)}
                      >清空</button>
                    )}
                  </div>
                  {!isEmpty && (
                    <div className="foreshadow-stage-body">
                      <label className="works-edit-label">章节</label>
                      <select
                        className="works-edit-input"
                        value={stage.anchor?.chapterId ?? ''}
                        onChange={(e) => {
                          const chapterId = e.target.value;
                          updateStage(m.stageKey, {
                            anchor: chapterId ? { ...(stage.anchor ?? makeAnchor(chapterId)), chapterId } : undefined,
                          });
                        }}
                      >
                        <option value="">（未选）</option>
                        {chapters.map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      {stage.anchor?.excerpt && (
                        <>
                          <label className="works-edit-label">锚定文字</label>
                          <div className="foreshadow-excerpt">「{stage.anchor.excerpt}」</div>
                        </>
                      )}
                      <label className="works-edit-label">备注</label>
                      <textarea
                        className="works-edit-textarea"
                        rows={2}
                        value={stage.note}
                        onChange={(e) => updateStage(m.stageKey, { note: e.target.value })}
                        placeholder={m.key === 'planted'
                          ? '怎么埋的？读者此时应该看到什么？'
                          : m.key === 'echoed'
                          ? '怎么暗示的？读者应该隐约察觉什么？'
                          : '怎么揭开的？对剧情造成什么影响？'}
                      />
                    </div>
                  )}
                </section>
              );
            })}

            <label className="works-edit-label">关联设定</label>
            <div className="foreshadow-link-row">
              {characterOrFactionLore.length === 0 ? (
                <span className="foreshadow-link-empty">还没有设定可以关联</span>
              ) : (
                characterOrFactionLore.map((l) => {
                  const active = (foreshadow.linkedLoreIds ?? []).includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`foreshadow-link-chip${active ? ' is-active' : ''}`}
                      onClick={() => toggleLink(l.id)}
                    >
                      <span className="foreshadow-link-type">{l.type}</span>
                      {l.name || '未命名'}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <footer className="lore-editor-foot">
          {confirmingDelete ? (
            <>
              <span className="lore-editor-confirm-hint">确定删除《{foreshadow.title || '未命名伏笔'}》？</span>
              <button type="button" className="btn-ghost btn-ghost-sm" onClick={() => setConfirmingDelete(false)}>取消</button>
              <button type="button" className="btn-danger" onClick={() => { onDelete(); onClose(); }}>删除</button>
            </>
          ) : (
            <>
              <button type="button" className="btn-ghost btn-ghost-sm is-subtle" onClick={() => setConfirmingDelete(true)}>删除伏笔</button>
              <span className="lore-editor-foot-spacer" />
              <button type="button" className="btn-ghost" onClick={onClose}>完成</button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
