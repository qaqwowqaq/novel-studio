const COPY_PROPS = [
  'boxSizing',
  'width',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'letterSpacing', 'lineHeight',
  'textTransform', 'whiteSpace', 'wordBreak', 'wordWrap', 'tabSize',
  'textIndent',
] as const;

/**
 * Return the pixel Y-offset (relative to textarea content top) of the caret
 * at `pos`, honoring soft-wrap. Uses a mirror-div with identical text-layout
 * styles so wrapped lines measure correctly.
 */
export function getTextareaCaretTop(ta: HTMLTextAreaElement, pos: number): number {
  const style = window.getComputedStyle(ta);
  const mirror = document.createElement('div');
  for (const key of COPY_PROPS) {
    mirror.style.setProperty(toKebab(key), style.getPropertyValue(toKebab(key)));
  }
  // Force measurement-friendly layout.
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '0';
  mirror.style.overflow = 'hidden';
  mirror.style.height = 'auto';
  mirror.style.maxWidth = 'none';

  const before = document.createTextNode(ta.value.substring(0, pos));
  const marker = document.createElement('span');
  marker.textContent = ta.value.substring(pos, pos + 1) || '.';
  mirror.appendChild(before);
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  document.body.removeChild(mirror);
  return top;
}

function toKebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
