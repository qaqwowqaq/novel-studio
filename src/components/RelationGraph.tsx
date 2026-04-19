import { useState } from 'react';
import type { CharacterRelation, LoreItem } from '../types';

interface RelationGraphProps {
  lore: LoreItem[];
  relations: CharacterRelation[];
  onAddRelation: (fromId: string, toId: string, label: string) => void;
  onRemoveRelation: (id: string) => void;
  onClose: () => void;
}

const COLORS = ['#8e5930', '#5c7a3d', '#4a6fa5', '#9b5094', '#b07c3e', '#3d7a7a'];

export function RelationGraph({ lore, relations, onAddRelation, onRemoveRelation, onClose }: RelationGraphProps) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [label, setLabel] = useState('');

  const characters = lore.filter((l) => l.type === '人物' || l.type === '势力');
  const cx = 240;
  const cy = 220;
  const radius = Math.min(160, characters.length > 2 ? 160 : 80);
  const n = characters.length;

  const nodes = characters.map((char, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    return { ...char, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), color: COLORS[i % COLORS.length] };
  });

  const nodeMap = new Map(nodes.map((nd) => [nd.id, nd]));

  const handleAdd = () => {
    if (!fromId || !toId || !label.trim() || fromId === toId) return;
    onAddRelation(fromId, toId, label.trim());
    setLabel('');
  };

  return (
    <div className="graph-overlay" role="dialog" aria-modal="true" aria-label="人物关系图谱">
      <div className="graph-header">
        <h2>人物关系图谱</h2>
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
      </div>

      <div className="graph-canvas">
        {characters.length === 0 ? (
          <div className="graph-empty">还没有人物或势力设定。先去设定库添加角色吧。</div>
        ) : (
          <svg viewBox="0 0 480 440" className="graph-svg">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-faint)" />
              </marker>
            </defs>

            {relations.map((rel) => {
              const from = nodeMap.get(rel.fromLoreId);
              const to = nodeMap.get(rel.toLoreId);
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              return (
                <g key={rel.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--ink-faint)" strokeWidth={1.5} markerEnd="url(#arrow)" />
                  <rect x={mx - rel.label.length * 7} y={my - 11} width={rel.label.length * 14 + 8} height={22} rx={4} fill="var(--drawer-bg)" stroke="var(--drawer-border)" />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-ui)">
                    {rel.label}
                  </text>
                </g>
              );
            })}

            {nodes.map((nd) => (
              <g key={nd.id}>
                <circle cx={nd.x} cy={nd.y} r={22} fill={nd.color} opacity={0.15} />
                <circle cx={nd.x} cy={nd.y} r={22} fill="none" stroke={nd.color} strokeWidth={2} />
                <text x={nd.x} y={nd.y + 5} textAnchor="middle" fontSize={13} fontWeight={600} fill={nd.color} fontFamily="var(--font-ui)">
                  {nd.name.slice(0, 2)}
                </text>
                <text x={nd.x} y={nd.y + 42} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-ui)">
                  {nd.name}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      <div className="graph-form">
        <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
          <option value="">从...</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="graph-arrow-icon">&rarr;</span>
        <select value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">到...</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="关系（如：师徒、宿敌）" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <button className="btn-add" type="button" onClick={handleAdd}>添加</button>
      </div>

      {relations.length > 0 && (
        <div className="graph-relation-list">
          {relations.map((rel) => {
            const from = lore.find((l) => l.id === rel.fromLoreId);
            const to = lore.find((l) => l.id === rel.toLoreId);
            return (
              <div key={rel.id} className="graph-relation-item">
                <span>{from?.name ?? '?'} → {to?.name ?? '?'}：{rel.label}</span>
                <button type="button" className="graph-remove-btn" onClick={() => onRemoveRelation(rel.id)}>删除</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
