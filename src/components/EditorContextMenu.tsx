import { useLayoutEffect, useRef, useState } from 'react';

export type EditorContextMenuEntry =
  | {
      id: string;
      type: 'item';
      label: string;
      hint?: string;
      disabled?: boolean;
      onSelect: () => void;
    }
  | {
      id: string;
      type: 'separator';
    };

interface EditorContextMenuProps {
  entries: EditorContextMenuEntry[];
  x: number;
  y: number;
  onClose: () => void;
}

export function EditorContextMenu({ entries, x, y, onClose }: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const margin = 12;
    const { innerWidth, innerHeight } = window;
    const { width, height } = menu.getBoundingClientRect();

    setPosition({
      left: Math.max(margin, Math.min(x, innerWidth - width - margin)),
      top: Math.max(margin, Math.min(y, innerHeight - height - margin)),
    });
  }, [entries, x, y]);

  return (
    <div className="context-menu-layer" onMouseDown={onClose} onContextMenu={(event) => event.preventDefault()} role="presentation">
      <div
        ref={menuRef}
        className="context-menu"
        style={{ left: position.left, top: position.top }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        role="menu"
        aria-label="编辑菜单"
      >
        {entries.map((entry) => {
          if (entry.type === 'separator') {
            return <div key={entry.id} className="context-menu-separator" role="separator" />;
          }

          return (
            <button
              key={entry.id}
              className="context-menu-item"
              type="button"
              disabled={entry.disabled}
              onClick={() => {
                if (entry.disabled) {
                  return;
                }

                entry.onSelect();
                onClose();
              }}
              role="menuitem"
            >
              <span className="context-menu-label">{entry.label}</span>
              {entry.hint && <span className="context-menu-hint">{entry.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
