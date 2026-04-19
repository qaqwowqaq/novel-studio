import type { FontId, FontSizeId, ThemeId } from '../types';

interface AppearanceSettingsProps {
  theme: ThemeId;
  font: FontId;
  fontSize: FontSizeId;
  onChangeTheme: (theme: ThemeId) => void;
  onChangeFont: (font: FontId) => void;
  onChangeFontSize: (size: FontSizeId) => void;
  onClose: () => void;
}

const THEMES: Array<{ id: ThemeId; label: string; color: string; ring: string }> = [
  { id: 'warm', label: '暖纸', color: '#f8f3eb', ring: '#8e5930' },
  { id: 'cool', label: '冷灰', color: '#f5f5f7', ring: '#4a6fa5' },
  { id: 'dark', label: '夜间', color: '#1e1e2e', ring: '#cba6f7' },
  { id: 'green', label: '墨绿', color: '#f0f4f0', ring: '#4a7c59' },
  { id: 'rose', label: '玫瑰', color: '#fdf2f5', ring: '#b5485d' },
];

const FONTS: Array<{ id: FontId; label: string; preview: string }> = [
  { id: 'serif', label: '宋体', preview: '"Noto Serif SC", "SimSun", serif' },
  { id: 'sans', label: '黑体', preview: '"Microsoft YaHei", sans-serif' },
  { id: 'kai', label: '楷体', preview: '"KaiTi", "STKaiti", serif' },
  { id: 'mono', label: '等宽', preview: '"Consolas", monospace' },
];

const SIZES: Array<{ id: FontSizeId; label: string }> = [
  { id: 'small', label: '小' },
  { id: 'medium', label: '中' },
  { id: 'large', label: '大' },
  { id: 'xlarge', label: '特大' },
];

export function AppearanceSettings({
  theme,
  font,
  fontSize,
  onChangeTheme,
  onChangeFont,
  onChangeFontSize,
  onClose,
}: AppearanceSettingsProps) {
  return (
    <div className="appearance-overlay" role="dialog" aria-modal="true" aria-label="外观设置">
      <div className="appearance-header">
        <h2>外观设置</h2>
        <button className="drawer-close" type="button" onClick={onClose} aria-label="关闭外观设置">
          ×
        </button>
      </div>
      <div className="appearance-body">
        <div className="appearance-section">
          <label className="appearance-label">主题配色</label>
          <div className="appearance-row">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`theme-swatch${theme === item.id ? ' is-active' : ''}`}
                onClick={() => onChangeTheme(item.id)}
                style={{ '--swatch-ring': item.ring } as React.CSSProperties}
              >
                <span
                  className="swatch-dot"
                  style={{
                    background: item.color,
                    border: item.id === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <span className="swatch-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="appearance-section">
          <label className="appearance-label">正文字体</label>
          <div className="appearance-row">
            {FONTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`font-chip${font === item.id ? ' is-active' : ''}`}
                style={{ fontFamily: item.preview }}
                onClick={() => onChangeFont(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="appearance-section">
          <label className="appearance-label">字号大小</label>
          <div className="appearance-row">
            {SIZES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`size-chip${fontSize === item.id ? ' is-active' : ''}`}
                onClick={() => onChangeFontSize(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
