import type { LibraryItemKind } from '../types';

export const KIND_ORDER: LibraryItemKind[] = [
  '描写片段',
  '知识参考',
  '设定素材',
  '灵感种子',
  '图像参考',
];

export const KIND_COLOR: Record<LibraryItemKind, string> = {
  描写片段: 'var(--accent)',
  知识参考: '#6b8fb4',
  设定素材: '#8fa97c',
  灵感种子: '#c09256',
  图像参考: '#a07aa8',
};
