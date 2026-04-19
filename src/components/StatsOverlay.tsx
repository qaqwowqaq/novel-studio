import type { DailyRecord, Work } from '../types';
import { getLast7Days } from '../utils';

interface StatsOverlayProps {
  work: Work;
  dailyRecords: DailyRecord[];
  dailyTarget: number;
  streakDays: number;
  todayWords: number;
  onClose: () => void;
}

export function StatsOverlay({ work, dailyRecords, dailyTarget, streakDays, todayWords, onClose }: StatsOverlayProps) {
  const totalWords = work.chapters.reduce((s, c) => s + c.wordCount, 0);
  const progress = dailyTarget > 0 ? Math.min(100, (todayWords / dailyTarget) * 100) : 0;

  const last7 = getLast7Days().map((date) => ({
    date,
    words: date === new Date().toISOString().slice(0, 10)
      ? todayWords
      : (dailyRecords.find((r) => r.date === date)?.wordsAdded ?? 0),
  }));

  const maxBar = Math.max(...last7.map((d) => d.words), dailyTarget, 1);
  const maxChapterWords = Math.max(...work.chapters.map((c) => c.wordCount), 1);

  return (
    <div className="stats-overlay" role="dialog" aria-modal="true" aria-label="写作统计">
      <div className="stats-header">
        <h2>写作统计</h2>
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
      </div>

      <div className="stats-body">
        <div className="stats-section">
          <div className="stats-big-number">{todayWords.toLocaleString()}</div>
          <div className="stats-label">今日已写（目标 {dailyTarget.toLocaleString()} 字）</div>
          <div className="stats-progress-track">
            <div className="stats-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="stats-row">
          <div className="stats-metric">
            <div className="stats-metric-value">{streakDays}</div>
            <div className="stats-metric-label">连续天数</div>
          </div>
          <div className="stats-metric">
            <div className="stats-metric-value">{totalWords.toLocaleString()}</div>
            <div className="stats-metric-label">作品总字数</div>
          </div>
          <div className="stats-metric">
            <div className="stats-metric-value">{work.chapters.length}</div>
            <div className="stats-metric-label">总章节</div>
          </div>
        </div>

        <div className="stats-section">
          <div className="stats-section-title">最近 7 天</div>
          <div className="stats-bar-chart">
            {last7.map((d) => (
              <div key={d.date} className="stats-bar-col">
                <div className="stats-bar-value">{d.words > 0 ? d.words : ''}</div>
                <div className="stats-bar-track">
                  <div className="stats-bar-fill" style={{ height: `${(d.words / maxBar) * 100}%` }} />
                </div>
                <div className="stats-bar-label">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <div className="stats-section-title">各章字数</div>
          <div className="stats-chapter-bars">
            {work.chapters.map((ch) => (
              <div key={ch.id} className="stats-chapter-row">
                <span className="stats-chapter-name">{ch.title}</span>
                <div className="stats-h-track">
                  <div className="stats-h-fill" style={{ width: `${(ch.wordCount / maxChapterWords) * 100}%` }} />
                </div>
                <span className="stats-chapter-count">{ch.wordCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
