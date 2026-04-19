interface TitleBarProps {
  onOpenAppearance: () => void;
}

export function TitleBar({ onOpenAppearance }: TitleBarProps) {
  const runWindowAction = async (action: 'windowClose' | 'windowMinimize' | 'windowMaximize') => {
    const handler = window.novelStudio?.[action];

    if (!handler) {
      window.alert('当前不是桌面模式，窗口控制不可用。');
      return;
    }

    const ok = await handler();

    if (!ok) {
      window.alert('窗口控制没有执行成功，请重启桌面应用后再试。');
    }
  };

  return (
    <header
      className="titlebar"
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('button')) {
          return;
        }

        void runWindowAction('windowMaximize');
      }}
    >
      <div className="titlebar-traffic" aria-label="窗口控制">
        <button
          className="traffic-btn traffic-close"
          type="button"
          onClick={() => void runWindowAction('windowClose')}
          aria-label="关闭窗口"
          title="关闭"
        />
        <button
          className="traffic-btn traffic-minimize"
          type="button"
          onClick={() => void runWindowAction('windowMinimize')}
          aria-label="最小化窗口"
          title="最小化"
        />
        <button
          className="traffic-btn traffic-maximize"
          type="button"
          onClick={() => void runWindowAction('windowMaximize')}
          aria-label="最大化或还原窗口"
          title="最大化 / 还原"
        />
      </div>

      <div className="titlebar-actions">
        <button className="titlebar-btn mac-toolbar-btn" type="button" onClick={onOpenAppearance} aria-label="外观设置" title="外观设置">
          <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M4 5h10" />
            <path d="M4 9h7" />
            <path d="M4 13h4" />
          </svg>
        </button>
      </div>
    </header>
  );
}
