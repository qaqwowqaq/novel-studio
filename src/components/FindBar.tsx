import { useEffect, useRef } from 'react';

export type FindScope = 'chapter' | 'work';

export interface SearchMatch {
  chapterId: string;
  chapterTitle: string;
  start: number;
  end: number;
  snippet: string;
  matchInSnippet: { start: number; end: number };
}

interface FindBarProps {
  query: string;
  scope: FindScope;
  caseSensitive: boolean;
  matches: SearchMatch[];
  currentIdx: number;
  onQueryChange: (q: string) => void;
  onScopeChange: (s: FindScope) => void;
  onToggleCase: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJump: (idx: number) => void;
  onClose: () => void;
}

export function FindBar({
  query,
  scope,
  caseSensitive,
  matches,
  currentIdx,
  onQueryChange,
  onScopeChange,
  onToggleCase,
  onPrev,
  onNext,
  onJump,
  onClose,
}: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrev(); else onNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const hasQuery = query.trim().length > 0;
  const total = matches.length;
  const displayIdx = total === 0 ? 0 : currentIdx + 1;

  return (
    <div className="find-bar" role="dialog" aria-label="查找">
      <div className="find-row">
        <input
          ref={inputRef}
          className="find-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={scope === 'chapter' ? '本章查找…' : '全作品查找…'}
          spellCheck={false}
        />

        <button
          type="button"
          className={`find-toggle${caseSensitive ? ' is-active' : ''}`}
          onClick={onToggleCase}
          title="区分大小写"
        >Aa</button>

        <div className="find-scope" role="tablist">
          <button
            type="button"
            role="tab"
            className={`find-scope-btn${scope === 'chapter' ? ' is-active' : ''}`}
            onClick={() => onScopeChange('chapter')}
          >本章</button>
          <button
            type="button"
            role="tab"
            className={`find-scope-btn${scope === 'work' ? ' is-active' : ''}`}
            onClick={() => onScopeChange('work')}
          >全作品</button>
        </div>

        <span className="find-count">
          {hasQuery ? (total === 0 ? '无' : `${displayIdx} / ${total}`) : '—'}
        </span>

        <button
          type="button"
          className="find-nav"
          onClick={onPrev}
          disabled={total === 0}
          title="上一个（Shift+Enter）"
        >↑</button>
        <button
          type="button"
          className="find-nav"
          onClick={onNext}
          disabled={total === 0}
          title="下一个（Enter）"
        >↓</button>

        <button
          type="button"
          className="find-close"
          onClick={onClose}
          title="关闭（Esc）"
        >✕</button>
      </div>

      {scope === 'work' && hasQuery && (
        <div className="find-results">
          {total === 0 ? (
            <div className="find-empty">没有匹配</div>
          ) : (
            matches.map((m, i) => (
              <button
                key={`${m.chapterId}-${m.start}`}
                type="button"
                className={`find-result${i === currentIdx ? ' is-active' : ''}`}
                onClick={() => onJump(i)}
              >
                <span className="find-result-chapter">{m.chapterTitle}</span>
                <span className="find-result-snippet">
                  <span className="find-snippet-before">{m.snippet.slice(0, m.matchInSnippet.start)}</span>
                  <mark className="find-snippet-hit">{m.snippet.slice(m.matchInSnippet.start, m.matchInSnippet.end)}</mark>
                  <span className="find-snippet-after">{m.snippet.slice(m.matchInSnippet.end)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
