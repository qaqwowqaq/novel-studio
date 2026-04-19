import { useEffect, useMemo, useState } from 'react';
import { pickImageAsset } from '../assets';
import type { AssetRecord, LoreItem, LoreType } from '../types';

interface LoreEditorProps {
  lore: LoreItem;
  assets: AssetRecord[];
  onChange: (patch: Partial<Pick<LoreItem, 'name' | 'description' | 'type' | 'imageAssetId' | 'aliases' | 'attributes' | 'tags'>>) => void;
  onAddAsset: (asset: AssetRecord) => void;
  onDelete: () => void;
  onClose: () => void;
}

const LORE_TYPES: LoreType[] = ['人物', '地点', '势力', '规则', '线索'];

type AttrKey = keyof NonNullable<LoreItem['attributes']>;
interface FieldDef { key: AttrKey; label: string; placeholder: string; rows: number; }

const FIELDS_BY_TYPE: Record<LoreType, FieldDef[]> = {
  '人物': [
    { key: 'role', label: '角色定位', placeholder: '主角 / 配角 / 反派 / 导师...', rows: 1 },
    { key: 'age', label: '年龄/外形概貌', placeholder: '25岁·身形瘦削', rows: 1 },
    { key: 'appearance', label: '外貌', placeholder: '面容、衣着、标志性特征...', rows: 3 },
    { key: 'personality', label: '性格', placeholder: '核心性格与矛盾面', rows: 3 },
    { key: 'background', label: '背景', placeholder: '出身、关键经历、动机...', rows: 3 },
  ],
  '地点': [
    { key: 'scale', label: '类别 / 规模', placeholder: '都城 / 村镇 / 秘境 / 府邸 ...', rows: 1 },
    { key: 'region', label: '方位', placeholder: '位于哪个地域、与其他地点的关系', rows: 1 },
    { key: 'landscape', label: '风貌', placeholder: '建筑、地势、气候、植被...', rows: 3 },
    { key: 'atmosphere', label: '氛围', placeholder: '光线、声音、气味、此地给人的感觉', rows: 3 },
    { key: 'inhabitants', label: '居住 / 掌控者', placeholder: '谁在这里、谁管这里', rows: 2 },
  ],
  '势力': [
    { key: 'nature', label: '性质', placeholder: '门派 / 朝廷 / 商会 / 地下组织 ...', rows: 1 },
    { key: 'leader', label: '掌权者', placeholder: '核心人物、代表面孔', rows: 1 },
    { key: 'territory', label: '势力范围', placeholder: '根据地、辐射区域、资源', rows: 2 },
    { key: 'creed', label: '主张 / 目标', placeholder: '他们想要什么、信什么', rows: 3 },
    { key: 'methods', label: '手段 / 风格', placeholder: '行事作风、惯用方法', rows: 2 },
    { key: 'relation', label: '与主角关系', placeholder: '盟友 / 敌对 / 中立 / 利用...', rows: 2 },
  ],
  '规则': [
    { key: 'scope', label: '作用范围', placeholder: '武学体系 / 魔法 / 社会律法 ...', rows: 1 },
    { key: 'principle', label: '核心原理', placeholder: '这条规则是怎么运作的', rows: 3 },
    { key: 'cost', label: '代价 / 条件', placeholder: '使用它需要付出什么', rows: 2 },
    { key: 'taboo', label: '限制 / 禁忌', placeholder: '绝对不能触犯的边界', rows: 2 },
  ],
  '线索': [
    { key: 'firstSeen', label: '出场', placeholder: '第几章第一次出现、如何出现', rows: 1 },
    { key: 'surface', label: '表面信息', placeholder: '读者/角色最初看到的样子', rows: 3 },
    { key: 'truth', label: '真相（仅作者可见）', placeholder: '背后实际是什么，藏着什么伏笔', rows: 3 },
    { key: 'linked', label: '关联人物 / 地点', placeholder: '牵扯进来的角色、地点、势力', rows: 2 },
    { key: 'payoff', label: '回收时机', placeholder: '打算在哪一章揭开或引爆', rows: 1 },
  ],
};

const KEY_INFO_PLACEHOLDER: Record<LoreType, string> = {
  '人物': '记住这个人物要注意的关键细节、约束、雷区...',
  '地点': '其他需要记住的关键细节、伏笔、约束...',
  '势力': '其他需要记住的关键细节、伏笔、约束...',
  '规则': '特殊例外、边缘情况、尚未决定的细节...',
  '线索': '回收时要保持一致的细节、伏笔、约束...',
};

export function LoreEditor({ lore, assets, onChange, onAddAsset, onDelete, onClose }: LoreEditorProps) {
  const asset = useMemo(
    () => (lore.imageAssetId ? assets.find((a) => a.id === lore.imageAssetId) : undefined),
    [lore.imageAssetId, assets],
  );

  const [aliasDraft, setAliasDraft] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleUpload = async () => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const next = await pickImageAsset({ maxEdge: 480, quality: 0.85 });
      if (next) {
        onAddAsset(next);
        onChange({ imageAssetId: next.id });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => onChange({ imageAssetId: undefined });

  const attrs = lore.attributes ?? {};

  const addAlias = () => {
    const v = aliasDraft.trim();
    if (!v) return;
    const existing = lore.aliases ?? [];
    if (existing.includes(v)) { setAliasDraft(''); return; }
    onChange({ aliases: [...existing, v] });
    setAliasDraft('');
  };

  const removeAlias = (value: string) => {
    const existing = lore.aliases ?? [];
    onChange({ aliases: existing.filter((a) => a !== value) });
  };

  const fields = FIELDS_BY_TYPE[lore.type] ?? [];
  const keyInfoPlaceholder = KEY_INFO_PLACEHOLDER[lore.type] ?? '写下这个条目要记住的关键细节、伏笔、约束...';

  return (
    <div className="lore-editor-backdrop" onClick={onClose} role="presentation">
      <div className="lore-editor-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="设定卡">
        <header className="lore-editor-head">
          <h3 className="lore-editor-title">设定卡</h3>
          <button className="drawer-close" type="button" onClick={onClose} aria-label="关闭">✕</button>
        </header>

        <div className="lore-editor-body">
          <div className="lore-editor-left">
            <div className={`lore-portrait${asset ? ' has-image' : ''}`}>
              {asset ? (
                <img src={asset.dataUrl} alt={lore.name || '头像'} />
              ) : (
                <span className="lore-portrait-placeholder">
                  {(lore.name.trim()[0] ?? '？')}
                </span>
              )}
            </div>
            <div className="lore-portrait-actions">
              <button type="button" className="btn-ghost btn-ghost-sm" disabled={isUploading} onClick={handleUpload}>
                {asset ? '更换' : '上传图片'}
              </button>
              {asset && (
                <button type="button" className="btn-ghost btn-ghost-sm" onClick={removeImage}>移除</button>
              )}
            </div>
            {uploadError && <p className="works-edit-hint is-error">{uploadError}</p>}
            {asset && (
              <p className="lore-portrait-meta">{asset.width}×{asset.height} · {Math.round(asset.bytes / 1024)} KB</p>
            )}
          </div>

          <div className="lore-editor-right">
            <label className="works-edit-label">类型</label>
            <div className="lore-editor-type-row">
              {LORE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`lore-type-chip${lore.type === t ? ' is-active' : ''}`}
                  onClick={() => onChange({ type: t })}
                >{t}</button>
              ))}
            </div>

            <label className="works-edit-label">名称</label>
            <input
              className="works-edit-input"
              value={lore.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={
                lore.type === '人物' ? '例：顾衍'
                : lore.type === '地点' ? '例：黑水城'
                : lore.type === '势力' ? '例：九渊司'
                : lore.type === '规则' ? '例：启脉七律'
                : '例：旧都密令'
              }
              autoFocus
            />

            <label className="works-edit-label">别号 / 称呼</label>
            <div className="lore-alias-row">
              <div className="lore-alias-tags">
                {(lore.aliases ?? []).map((a) => (
                  <span key={a} className="lore-alias-tag">
                    {a}
                    <button type="button" className="lore-alias-remove" onClick={() => removeAlias(a)} aria-label={`删除 ${a}`}>×</button>
                  </span>
                ))}
                <input
                  className="lore-alias-input"
                  value={aliasDraft}
                  onChange={(e) => setAliasDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addAlias(); }
                    else if (e.key === 'Backspace' && !aliasDraft && (lore.aliases ?? []).length > 0) {
                      const last = (lore.aliases ?? [])[(lore.aliases ?? []).length - 1];
                      removeAlias(last);
                    }
                  }}
                  placeholder={(lore.aliases?.length ?? 0) === 0 ? '回车添加，如：九娘、刀修' : ''}
                />
              </div>
            </div>

            <label className="works-edit-label">简介</label>
            <textarea
              className="works-edit-textarea"
              rows={3}
              value={lore.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="一两句话说清这个设定是什么、它的核心特征"
            />

            {fields.map((f) => (
              <div key={f.key}>
                <label className="works-edit-label">{f.label}</label>
                {f.rows === 1 ? (
                  <input
                    className="works-edit-input"
                    value={attrs[f.key] ?? ''}
                    onChange={(e) => onChange({ attributes: { [f.key]: e.target.value } })}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <textarea
                    className="works-edit-textarea"
                    rows={f.rows}
                    value={attrs[f.key] ?? ''}
                    onChange={(e) => onChange({ attributes: { [f.key]: e.target.value } })}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}

            <label className="works-edit-label">关键信息</label>
            <textarea
              className="works-edit-textarea"
              rows={3}
              value={attrs.keyInfo ?? ''}
              onChange={(e) => onChange({ attributes: { keyInfo: e.target.value } })}
              placeholder={keyInfoPlaceholder}
            />
          </div>
        </div>

        <footer className="lore-editor-foot">
          {confirmingDelete ? (
            <>
              <span className="lore-editor-confirm-hint">确定删除《{lore.name || '未命名'}》？</span>
              <button type="button" className="btn-ghost btn-ghost-sm" onClick={() => setConfirmingDelete(false)}>取消</button>
              <button type="button" className="btn-danger" onClick={() => { onDelete(); onClose(); }}>删除</button>
            </>
          ) : (
            <>
              <button type="button" className="btn-ghost btn-ghost-sm is-subtle" onClick={() => setConfirmingDelete(true)}>删除设定</button>
              <span className="lore-editor-foot-spacer" />
              <button type="button" className="btn-ghost" onClick={onClose}>完成</button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
