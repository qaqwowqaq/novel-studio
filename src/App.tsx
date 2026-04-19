import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import './App.css';
import { isLowRisk, parseAssistantReply } from './ai/proposals';
import { pickProvider } from './ai/registry';
import { AiSettings } from './components/AiSettings';
import { AnnotationMargin } from './components/AnnotationMargin';
import { InlineAnnotationLayer, type AnchorMark } from './components/InlineAnnotationLayer';
import { AppearanceSettings } from './components/AppearanceSettings';
import { ChapterDrawer } from './components/ChapterDrawer';
import { LeftDock, type LeftDockTab } from './components/LeftDock';
import { RightDock } from './components/RightDock';
import { CommandPalette } from './components/CommandPalette';
import { EditorContextMenu } from './components/EditorContextMenu';
import { FindBar, type FindScope, type SearchMatch } from './components/FindBar';
import { LibraryView } from './components/LibraryView';
import { RelationGraph } from './components/RelationGraph';
import { StatsOverlay } from './components/StatsOverlay';
import { TitleBar } from './components/TitleBar';
import { ToolDrawer } from './components/ToolDrawer';
import { WorksLibrary } from './components/WorksLibrary';
import { buildCodexWritingPrompt } from './codexPrompt';
import { useTypingSpeed } from './hooks/useWritingSpeed';
import { getTextareaCaretTop } from './hooks/useTextareaCaret';
import { createBlankChapter, createBlankWork, createDefaultAiConfig, createSeedData } from './sampleData';
import { buildWorkFromPreview, type ImportedBookPreview } from './workImport';
import { loadAppData, saveAppData } from './storage';
import type { AiProviderConfig, AiProviderStatus, Anchor, AppData, AssetRecord, Chapter, ChapterSnapshot, FontId, FontSizeId, Foreshadow, Library, LibraryCollection, LibraryItem, LibraryItemKind, LoreAttributes, LoreItem, LoreType, PanelTab, Proposal, ThemeId, Work, WorkCover } from './types';
import { collectGarbageAssets, upsertAsset } from './assets';
import { buildAnchorFromSelection, locateAnchorInChapter } from './anchors';
import { importFile, importHtmlString, importImageBlob, importPlainTextString, type ImportContext, type ImportedEntry } from './library/importers';
import { countChars, downloadFile, exportToMarkdown, exportToText, formatDateTime, getTodayStr, toCnNumber } from './utils';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Overlay = 'none' | 'command' | 'chapters' | 'tools' | 'stats' | 'graph' | 'appearance' | 'ai-settings' | 'works' | 'library';
type EditorContextMenuState = {
  x: number;
  y: number;
  selectionStart: number;
  selectionEnd: number;
  selectionText: string;
};

const STREAM_REVEAL_CHARS = 48;
const STREAM_REVEAL_DELAY_MS = 24;

function splitMarkdownForReveal(text: string) {
  const tokens = text.match(/(\n{2,}|[^\s]+\s*|\s+)/g) ?? [text];
  const chunks: string[] = [];
  let buffer = '';

  for (const token of tokens) {
    buffer += token;
    if (buffer.length >= STREAM_REVEAL_CHARS || token.includes('\n')) {
      chunks.push(buffer);
      buffer = '';
    }
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks.length > 0 ? chunks : [text];
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveTime, setSaveTime] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [toolTab, setToolTab] = useState<PanelTab>('outline');
  const [focusMode, setFocusMode] = useState(false);
  const [focusBandY, setFocusBandY] = useState(-1);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [leftDockOpen, setLeftDockOpen] = useState(false);
  const [leftDockTab, setLeftDockTab] = useState<LeftDockTab>('volume');
  const [rightDockItemIds, setRightDockItemIds] = useState<string[]>([]);
  const [rightDockActiveId, setRightDockActiveId] = useState<string | null>(null);
  const [rightDockVisible, setRightDockVisible] = useState(true);
  const [rightDockWidth, setRightDockWidth] = useState<number>(() => {
    try {
      const v = Number(window.localStorage.getItem('rightDockWidth'));
      if (v >= 280 && v <= 720) return v;
    } catch {}
    return 360;
  });
  const [todayWords, setTodayWords] = useState(0);
  const [paletteInitialQuery, setPaletteInitialQuery] = useState('');
  const [initialEditLoreId, setInitialEditLoreId] = useState<string | null>(null);
  const [initialEditForeshadowId, setInitialEditForeshadowId] = useState<string | null>(null);
  const [draftIdea, setDraftIdea] = useState('');
  const [draftAiInput, setDraftAiInput] = useState('');
  const [editorContextMenu, setEditorContextMenu] = useState<EditorContextMenuState | null>(null);
  const [providerStatus, setProviderStatus] = useState<AiProviderStatus>({ kind: 'codex', available: false, label: 'Codex CLI', detail: '正在检测...' });
  const [isAiSending, setIsAiSending] = useState(false);
  const [streamingAiContent, setStreamingAiContent] = useState('');
  const aiAbortRef = useRef<AbortController | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findScope, setFindScope] = useState<FindScope>('chapter');
  const [findQuery, setFindQuery] = useState('');
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [findCurrentIdx, setFindCurrentIdx] = useState(0);

  const dataRef = useRef<AppData | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const manuscriptRef = useRef<HTMLDivElement>(null);
  const [annotationScrollTick, setAnnotationScrollTick] = useState(0);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const pendingIdeaAnchorRef = useRef<Anchor | null>(null);

  useEffect(() => { dataRef.current = data; }, [data]);

  const themeId = data?.preferences.appearance?.theme;
  const fontId = data?.preferences.appearance?.font;
  const fontSizeId = data?.preferences.appearance?.fontSize;

  useEffect(() => {
    if (!themeId || !fontId || !fontSizeId) return;
    const el = document.documentElement;
    el.dataset.theme = themeId;
    el.dataset.font = fontId;
    el.dataset.fontsize = fontSizeId;
  }, [themeId, fontId, fontSizeId]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const loaded = await loadAppData();
      if (cancelled) return;
      setData(loaded);
      setToolTab(loaded.preferences.lastPanelTab);
      setSaveState('saved');
      setSaveTime(formatDateTime(loaded.metadata.lastOpenedAt));
      const today = getTodayStr();
      setTodayWords(loaded.dailyRecords?.find((r) => r.date === today)?.wordsAdded ?? 0);
      setIsHydrated(true);
    }
    void boot();
    return () => { cancelled = true; };
  }, []);

  const aiConfig = useMemo<AiProviderConfig>(
    () => data?.preferences.ai ?? createDefaultAiConfig(),
    [data?.preferences.ai],
  );

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      try {
        const provider = pickProvider(aiConfig);
        const status = await provider.getStatus();
        if (!cancelled) setProviderStatus(status);
      } catch (error) {
        if (!cancelled) {
          setProviderStatus({
            kind: aiConfig.kind,
            available: false,
            label: aiConfig.kind === 'codex' ? 'Codex CLI' : (aiConfig.openaiCompat.providerLabel || 'OpenAI 兼容'),
            detail: error instanceof Error ? error.message : '检测失败',
          });
        }
      }
    }
    void detect();
    return () => { cancelled = true; };
  }, [aiConfig]);

  const activeWork = useMemo(() => {
    if (!data) return null;
    return data.works.find((w) => w.id === data.preferences.activeWorkId) ?? data.works[0] ?? null;
  }, [data]);

  const activeChapter = useMemo(() => {
    if (!activeWork || !data) return null;
    return activeWork.chapters.find((c) => c.id === data.preferences.activeChapterId) ?? activeWork.chapters[0] ?? null;
  }, [activeWork, data]);

  const { speed: writingSpeed, recordTyping } = useTypingSpeed();
  const lastInputTypedRef = useRef(false);
  const isComposingRef = useRef(false);
  const preCompositionCharsRef = useRef(0);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onCompositionStart = () => {
      isComposingRef.current = true;
      preCompositionCharsRef.current = countChars(ta.value);
    };
    const onCompositionEnd = () => {
      isComposingRef.current = false;
      // At compositionend, ta.value already contains the committed text.
      const nextCount = countChars(ta.value);
      const delta = nextCount - preCompositionCharsRef.current;
      if (delta > 0) {
        setTodayWords((w) => w + delta);
        recordTyping(delta);
      }
    };
    const onBeforeInput = (event: Event) => {
      if (isComposingRef.current) {
        lastInputTypedRef.current = false;
        return;
      }
      const t = (event as InputEvent).inputType ?? '';
      lastInputTypedRef.current =
        t === 'insertText' || t === 'insertLineBreak' || t === 'insertParagraph';
    };
    ta.addEventListener('compositionstart', onCompositionStart);
    ta.addEventListener('compositionend', onCompositionEnd);
    ta.addEventListener('beforeinput', onBeforeInput);
    return () => {
      ta.removeEventListener('compositionstart', onCompositionStart);
      ta.removeEventListener('compositionend', onCompositionEnd);
      ta.removeEventListener('beforeinput', onBeforeInput);
    };
  }, [activeChapter?.id, recordTyping]);

  const annotationMarks = useMemo<AnchorMark[]>(() => {
    if (!annotationMode || !activeWork || !activeChapter) return [];
    const marks: AnchorMark[] = [];
    for (const f of activeWork.foreshadows ?? []) {
      const stages: Array<['planted' | 'echoed' | 'paid_off', { anchor?: Anchor; note: string } | undefined]> = [
        ['planted', f.planted],
        ['echoed', f.echoed],
        ['paid_off', f.paidOff],
      ];
      for (const [kind, stage] of stages) {
        const anchor = stage?.anchor;
        if (anchor?.chapterId === activeChapter.id) {
          const hit = locateAnchorInChapter(anchor, activeChapter);
          if (hit) {
            const preview = (stage?.note || f.description || '').trim();
            marks.push({
              id: `f:${f.id}:${kind}`,
              start: hit.start,
              end: hit.end,
              kind,
              title: f.title || '未命名伏笔',
              preview,
              foreshadowId: f.id,
            });
          }
        }
      }
    }
    for (const idea of activeWork.ideas) {
      if (idea.anchor?.chapterId === activeChapter.id) {
        const hit = locateAnchorInChapter(idea.anchor, activeChapter);
        if (hit) {
          marks.push({
            id: `i:${idea.id}`,
            start: hit.start,
            end: hit.end,
            kind: 'idea',
            title: '',
            preview: idea.content.trim(),
          });
        }
      }
    }
    return marks;
  }, [annotationMode, activeWork, activeChapter]);

  const setPendingSelection = (start: number, end = start) => {
    pendingSelectionRef.current = { start, end };
  };

  const focusEditorSelection = (start: number, end = start) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(start, end);

    if (focusMode) {
      requestAnimationFrame(() => updateFocusBand());
    }
  };

  const normalizeSelectionText = (text: string) => text.replace(/\s+/g, ' ').trim();

  const writeClipboardText = async (text: string) => {
    if (window.novelStudio?.writeClipboardText) {
      await window.novelStudio.writeClipboardText(text);
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    throw new Error('clipboard-write-unavailable');
  };

  const readClipboardText = async () => {
    if (window.novelStudio?.readClipboardText) {
      return window.novelStudio.readClipboardText();
    }

    if (navigator.clipboard?.readText) {
      return navigator.clipboard.readText();
    }

    throw new Error('clipboard-read-unavailable');
  };

  const persistData = useEffectEvent(async (nextData: AppData) => {
    const today = getTodayStr();
    const records = [...nextData.dailyRecords];
    const idx = records.findIndex((r) => r.date === today);
    if (idx >= 0) { records[idx] = { ...records[idx], wordsAdded: todayWords }; }
    else if (todayWords > 0) { records.push({ date: today, wordsAdded: todayWords }); }
    const withRecords = collectGarbageAssets({ ...nextData, dailyRecords: records });

    setSaveState('saving');
    try {
      const result = await saveAppData(withRecords);
      setSaveState('saved');
      setSaveTime(formatDateTime(result.savedAt));
    } catch { setSaveState('error'); }
  });

  useEffect(() => {
    if (!data || !isHydrated) return;
    const timer = window.setTimeout(() => void persistData(data), 650);
    return () => window.clearTimeout(timer);
  }, [data, isHydrated]);

  const updateData = (updater: (current: AppData) => AppData) => {
    setData((current) => {
      const base = current ?? createSeedData();
      const next = updater(base);
      return { ...next, metadata: { ...next.metadata, lastOpenedAt: new Date().toISOString() } };
    });
  };

  const updateChapter = (updater: (chapter: Chapter) => Chapter) => {
    if (!activeWork || !activeChapter) return;
    const workId = activeWork.id;
    const chapterId = activeChapter.id;
    updateData((current) => ({
      ...current,
      works: current.works.map((work) => {
        if (work.id !== workId) return work;
        return {
          ...work,
          chapters: work.chapters.map((ch) => {
            if (ch.id !== chapterId) return ch;
            const next = updater(ch);
            return { ...next, wordCount: countChars(next.content), updatedAt: new Date().toISOString() };
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const selectChapter = (chapterId: string) => {
    if (activeChapter && activeChapter.content.length > 0) {
      createSnapshot();
    }
    updateData((c) => ({ ...c, preferences: { ...c.preferences, activeChapterId: chapterId } }));
  };

  const selectWork = (workId: string) => {
    updateData((current) => {
      const work = current.works.find((w) => w.id === workId);
      return { ...current, preferences: { ...current.preferences, activeWorkId: workId, activeChapterId: work?.chapters[0]?.id ?? current.preferences.activeChapterId } };
    });
  };

  const addChapter = (rawTitle: string, volumeId?: string) => {
    if (!activeWork || !rawTitle.trim()) return;
    const workId = activeWork.id;
    const globalIndex = activeWork.chapters.length + 1;
    const composedTitle = `第${globalIndex}章 ${rawTitle.trim()}`;
    const chapter = createBlankChapter(composedTitle, globalIndex, volumeId);
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        const chapters = [...w.chapters];
        if (volumeId) {
          let insertAt = chapters.length;
          for (let i = chapters.length - 1; i >= 0; i--) {
            if (chapters[i].volumeId === volumeId) {
              insertAt = i + 1;
              break;
            }
          }
          chapters.splice(insertAt, 0, chapter);
        } else {
          chapters.push(chapter);
        }
        return { ...w, chapters, updatedAt: new Date().toISOString() };
      }),
      preferences: { ...c.preferences, activeChapterId: chapter.id },
    }));
  };

  const addVolume = (rawTitle: string) => {
    if (!activeWork || !rawTitle.trim()) return;
    const workId = activeWork.id;
    const nowIso = new Date().toISOString();
    const volumeIndex = (activeWork.volumes?.length ?? 0) + 1;
    const composedTitle = `第${toCnNumber(volumeIndex)}卷 · ${rawTitle.trim()}`;
    const volume = { id: crypto.randomUUID(), title: composedTitle, createdAt: nowIso, updatedAt: nowIso };
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => w.id === workId ? { ...w, volumes: [...(w.volumes ?? []), volume], updatedAt: nowIso } : w),
    }));
  };

  const renameVolume = (volumeId: string, title: string) => {
    if (!activeWork || !title.trim()) return;
    const workId = activeWork.id;
    const nowIso = new Date().toISOString();
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          volumes: (w.volumes ?? []).map((v) => v.id === volumeId ? { ...v, title: title.trim(), updatedAt: nowIso } : v),
          updatedAt: nowIso,
        };
      }),
    }));
  };

  const deleteChapter = (chapterId: string) => {
    if (!activeWork) return;
    const workId = activeWork.id;
    updateData((c) => {
      const work = c.works.find((w) => w.id === workId);
      if (!work) return c;
      const nextChapters = work.chapters.filter((ch) => ch.id !== chapterId);
      const nextActiveId = c.preferences.activeChapterId === chapterId
        ? nextChapters[0]?.id ?? ''
        : c.preferences.activeChapterId;
      return {
        ...c,
        works: c.works.map((w) => w.id === workId ? { ...w, chapters: nextChapters, updatedAt: new Date().toISOString() } : w),
        preferences: { ...c.preferences, activeChapterId: nextActiveId },
        snapshots: c.snapshots.filter((s) => s.chapterId !== chapterId),
      };
    });
  };

  const deleteVolume = (volumeId: string, keepChapters: boolean) => {
    if (!activeWork) return;
    const workId = activeWork.id;
    updateData((c) => {
      const work = c.works.find((w) => w.id === workId);
      if (!work) return c;
      const chaptersInVolume = work.chapters.filter((ch) => ch.volumeId === volumeId);
      const chapterIdsToDelete = new Set(keepChapters ? [] : chaptersInVolume.map((ch) => ch.id));
      const nextChapters = work.chapters
        .filter((ch) => !chapterIdsToDelete.has(ch.id))
        .map((ch) => ch.volumeId === volumeId ? { ...ch, volumeId: undefined } : ch);
      const nextVolumes = (work.volumes ?? []).filter((v) => v.id !== volumeId);
      const nextActiveId = chapterIdsToDelete.has(c.preferences.activeChapterId)
        ? nextChapters[0]?.id ?? ''
        : c.preferences.activeChapterId;
      return {
        ...c,
        works: c.works.map((w) => w.id === workId ? { ...w, chapters: nextChapters, volumes: nextVolumes, updatedAt: new Date().toISOString() } : w),
        preferences: { ...c.preferences, activeChapterId: nextActiveId },
        snapshots: c.snapshots.filter((s) => !chapterIdsToDelete.has(s.chapterId)),
      };
    });
  };

  const moveChapterToVolume = (chapterId: string, targetVolumeId: string | undefined) => {
    if (!activeWork) return;
    const workId = activeWork.id;
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        const idx = w.chapters.findIndex((ch) => ch.id === chapterId);
        if (idx < 0) return w;
        const chapter = w.chapters[idx];
        if (chapter.volumeId === targetVolumeId) return w;
        const moved = { ...chapter, volumeId: targetVolumeId, updatedAt: new Date().toISOString() };
        const withoutIt = [...w.chapters.slice(0, idx), ...w.chapters.slice(idx + 1)];
        let insertAt = withoutIt.length;
        if (targetVolumeId) {
          for (let i = withoutIt.length - 1; i >= 0; i--) {
            if (withoutIt[i].volumeId === targetVolumeId) { insertAt = i + 1; break; }
          }
          if (insertAt === withoutIt.length && !withoutIt.some((ch) => ch.volumeId === targetVolumeId)) {
            const volumes = w.volumes ?? [];
            const targetPos = volumes.findIndex((v) => v.id === targetVolumeId);
            let placeholder = withoutIt.length;
            for (let i = 0; i < withoutIt.length; i++) {
              const chVolId = withoutIt[i].volumeId;
              if (chVolId) {
                const pos = volumes.findIndex((v) => v.id === chVolId);
                if (pos > targetPos) { placeholder = i; break; }
              } else {
                placeholder = i;
                break;
              }
            }
            insertAt = placeholder;
          }
        } else {
          insertAt = withoutIt.length;
        }
        const nextChapters = [...withoutIt.slice(0, insertAt), moved, ...withoutIt.slice(insertAt)];
        return { ...w, chapters: nextChapters, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  const reorderVolume = (volumeId: string, direction: 'up' | 'down') => {
    if (!activeWork) return;
    const workId = activeWork.id;
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        const volumes = [...(w.volumes ?? [])];
        const i = volumes.findIndex((v) => v.id === volumeId);
        if (i < 0) return w;
        const j = direction === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= volumes.length) return w;
        [volumes[i], volumes[j]] = [volumes[j], volumes[i]];
        const chaptersByVolume = new Map<string, Chapter[]>();
        const unassigned: Chapter[] = [];
        for (const ch of w.chapters) {
          if (ch.volumeId) {
            if (!chaptersByVolume.has(ch.volumeId)) chaptersByVolume.set(ch.volumeId, []);
            chaptersByVolume.get(ch.volumeId)!.push(ch);
          } else {
            unassigned.push(ch);
          }
        }
        const nextChapters: Chapter[] = [];
        for (const v of volumes) {
          const items = chaptersByVolume.get(v.id);
          if (items) nextChapters.push(...items);
        }
        nextChapters.push(...unassigned);
        return { ...w, volumes, chapters: nextChapters, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  const addWork = (title: string) => {
    if (!title.trim()) return;
    const work = createBlankWork(title.trim());
    updateData((c) => ({
      ...c, works: [work, ...c.works],
      preferences: { ...c.preferences, activeWorkId: work.id, activeChapterId: work.chapters[0].id },
    }));
  };

  const importWork = (
    preview: ImportedBookPreview,
    overrides: { title: string; synopsis: string },
  ) => {
    const work = buildWorkFromPreview(preview, overrides);
    updateData((c) => ({
      ...c,
      works: [work, ...c.works],
      preferences: {
        ...c.preferences,
        activeWorkId: work.id,
        activeChapterId: work.chapters[0]?.id ?? c.preferences.activeChapterId,
      },
    }));
  };

  const updateWorkMeta = (
    workId: string,
    patch: Partial<Pick<Work, 'title' | 'synopsis' | 'genre' | 'cover'>>,
  ) => {
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        const nextCover: WorkCover | undefined = patch.cover
          ? { ...(w.cover ?? {}), ...patch.cover }
          : w.cover;
        return {
          ...w,
          title: patch.title !== undefined ? patch.title : w.title,
          synopsis: patch.synopsis !== undefined ? patch.synopsis : w.synopsis,
          genre: patch.genre !== undefined ? patch.genre : w.genre,
          cover: nextCover,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const addAsset = (asset: AssetRecord) => {
    updateData((c) => upsertAsset(c, asset));
  };

  const ensureLibrary = (c: AppData): Library => c.library ?? { collections: [], items: [] };

  const addLibraryCollection = (name: string) => {
    const col: LibraryCollection = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateData((c) => ({
      ...c,
      library: { ...ensureLibrary(c), collections: [...ensureLibrary(c).collections, col] },
    }));
  };

  const renameLibraryCollection = (id: string, name: string) => {
    updateData((c) => {
      const lib = ensureLibrary(c);
      return {
        ...c,
        library: {
          ...lib,
          collections: lib.collections.map((col) =>
            col.id === id ? { ...col, name, updatedAt: new Date().toISOString() } : col,
          ),
        },
      };
    });
  };

  const deleteLibraryCollection = (id: string) => {
    updateData((c) => {
      const lib = ensureLibrary(c);
      return {
        ...c,
        library: {
          collections: lib.collections.filter((col) => col.id !== id),
          items: lib.items.filter((it) => it.collectionId !== id),
        },
      };
    });
  };

  const createLibraryItem = (collectionId: string, kind: LibraryItemKind): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item: LibraryItem = {
      id,
      collectionId,
      kind,
      title: '',
      body: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    updateData((c) => ({
      ...c,
      library: { ...ensureLibrary(c), items: [item, ...ensureLibrary(c).items] },
    }));
    return id;
  };

  const updateLibraryItem = (id: string, patch: Partial<LibraryItem>, newAsset?: AssetRecord) => {
    updateData((c) => {
      const baseAssets = newAsset ? upsertAsset(c, newAsset).assets : c.assets;
      const lib = ensureLibrary(c);
      return {
        ...c,
        assets: baseAssets,
        library: {
          ...lib,
          items: lib.items.map((it) =>
            it.id === id
              ? { ...it, ...patch, updatedAt: new Date().toISOString() }
              : it,
          ),
        },
      };
    });
  };

  const deleteLibraryItem = (id: string) => {
    updateData((c) => {
      const lib = ensureLibrary(c);
      return {
        ...c,
        library: { ...lib, items: lib.items.filter((it) => it.id !== id) },
      };
    });
  };

  const ensureImportContext = (requestedCollectionId?: string | 'all'): ImportContext | null => {
    const lib = dataRef.current?.library ?? { collections: [], items: [] };
    let collectionId: string | undefined;
    if (requestedCollectionId && requestedCollectionId !== 'all') {
      collectionId = lib.collections.find((c) => c.id === requestedCollectionId)?.id;
    }
    if (!collectionId) collectionId = lib.collections[0]?.id;
    if (!collectionId) {
      const newCol: LibraryCollection = {
        id: crypto.randomUUID(),
        name: '未分类',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateData((c) => ({
        ...c,
        library: { ...ensureLibrary(c), collections: [...ensureLibrary(c).collections, newCol] },
      }));
      collectionId = newCol.id;
    }
    const names = new Map<string, string>();
    for (const c of lib.collections) names.set(c.id, c.name);
    if (!names.has(collectionId)) names.set(collectionId, '未分类');
    return { collectionId, collectionNames: names };
  };

  const applyImportedEntries = (entries: ImportedEntry[]) => {
    if (entries.length === 0) return;
    updateData((c) => {
      const lib = ensureLibrary(c);
      let assets = c.assets ?? [];
      for (const entry of entries) {
        if (entry.newAsset) {
          assets = upsertAsset({ ...c, assets }, entry.newAsset).assets;
        }
      }
      return {
        ...c,
        assets,
        library: { ...lib, items: [...entries.map((e) => e.item), ...lib.items] },
      };
    });
  };

  const importLibraryFiles = async (files: File[], requestedCollectionId?: string | 'all'): Promise<{ imported: number; failed: number }> => {
    const ctx = ensureImportContext(requestedCollectionId);
    if (!ctx) return { imported: 0, failed: files.length };
    const entries: ImportedEntry[] = [];
    let failed = 0;
    for (const file of files) {
      try {
        const entry = await importFile(file, ctx);
        entries.push(entry);
      } catch (err) {
        console.error('素材导入失败', file.name, err);
        failed += 1;
      }
    }
    applyImportedEntries(entries);
    return { imported: entries.length, failed };
  };

  const importLibraryClipboard = async (clip: DataTransfer, requestedCollectionId?: string | 'all'): Promise<{ imported: number; failed: number }> => {
    const ctx = ensureImportContext(requestedCollectionId);
    if (!ctx) return { imported: 0, failed: 1 };
    const imageItem = Array.from(clip.items).find((it) => it.kind === 'file' && it.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        try {
          const entry = await importImageBlob(file, ctx, file.name || '粘贴图片');
          applyImportedEntries([entry]);
          return { imported: 1, failed: 0 };
        } catch (err) {
          console.error('粘贴图片失败', err);
          return { imported: 0, failed: 1 };
        }
      }
    }
    const html = clip.getData('text/html');
    if (html && html.trim()) {
      const entry = importHtmlString(html, ctx);
      applyImportedEntries([entry]);
      return { imported: 1, failed: 0 };
    }
    const text = clip.getData('text/plain');
    if (text && text.trim()) {
      const entry = importPlainTextString(text, ctx);
      applyImportedEntries([entry]);
      return { imported: 1, failed: 0 };
    }
    return { imported: 0, failed: 0 };
  };

  const updateLoreItem = (
    workId: string,
    loreId: string,
    patch: Partial<Pick<LoreItem, 'name' | 'description' | 'type' | 'imageAssetId' | 'aliases' | 'attributes' | 'tags'>>,
  ) => {
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          lore: w.lore.map((l) => {
            if (l.id !== loreId) return l;
            const nextAttrs: LoreAttributes = patch.attributes
              ? { ...(l.attributes ?? {}), ...patch.attributes }
              : l.attributes ?? {};
            return {
              ...l,
              name: patch.name !== undefined ? patch.name : l.name,
              description: patch.description !== undefined ? patch.description : l.description,
              type: patch.type !== undefined ? patch.type : l.type,
              imageAssetId: patch.imageAssetId !== undefined ? patch.imageAssetId : l.imageAssetId,
              aliases: patch.aliases !== undefined ? patch.aliases : l.aliases,
              attributes: nextAttrs,
              tags: patch.tags !== undefined ? patch.tags : l.tags,
              updatedAt: new Date().toISOString(),
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const deleteLoreItem = (workId: string, loreId: string) => {
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          lore: w.lore.filter((l) => l.id !== loreId),
          relations: w.relations.filter((r) => r.fromLoreId !== loreId && r.toLoreId !== loreId),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const deleteWork = (workId: string) => {
    updateData((c) => {
      if (c.works.length <= 1) return c;
      const nextWorks = c.works.filter((w) => w.id !== workId);
      const nextActiveWorkId = c.preferences.activeWorkId === workId
        ? nextWorks[0].id
        : c.preferences.activeWorkId;
      const nextActiveChapterId = c.preferences.activeWorkId === workId
        ? nextWorks[0].chapters[0]?.id ?? ''
        : c.preferences.activeChapterId;
      const remainingChapterIds = new Set(nextWorks.flatMap((w) => w.chapters.map((ch) => ch.id)));
      return {
        ...c,
        works: nextWorks,
        preferences: {
          ...c.preferences,
          activeWorkId: nextActiveWorkId,
          activeChapterId: nextActiveChapterId,
        },
        snapshots: c.snapshots.filter((s) => remainingChapterIds.has(s.chapterId)),
      };
    });
  };

  const createBlankLore = (type: LoreType = '人物'): string => {
    if (!activeWork) return '';
    const workId = activeWork.id;
    const id = crypto.randomUUID();
    const lore: LoreItem = {
      id,
      type,
      name: '',
      description: '',
      firstAppearanceChapterId: activeChapter?.id ?? '',
      tags: [],
      aliases: [],
      attributes: {},
      updatedAt: new Date().toISOString(),
    };
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => w.id === workId
        ? { ...w, lore: [lore, ...w.lore], updatedAt: new Date().toISOString() }
        : w),
    }));
    return id;
  };

  const createBlankForeshadow = (seedAnchor?: Anchor): string => {
    if (!activeWork) return '';
    const workId = activeWork.id;
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const anchor: Anchor | undefined = seedAnchor ?? (activeChapter ? {
      chapterId: activeChapter.id,
      excerpt: '',
      contextBefore: '',
      contextAfter: '',
      createdAt: nowIso,
    } : undefined);
    const f: Foreshadow = {
      id,
      title: '',
      description: '',
      state: 'planted',
      planted: { at: nowIso, note: '', anchor },
      linkedLoreIds: [],
      tags: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => w.id === workId
        ? { ...w, foreshadows: [f, ...(w.foreshadows ?? [])], updatedAt: nowIso }
        : w),
    }));
    return id;
  };

  const updateForeshadow = (workId: string, foreshadowId: string, patch: Partial<Foreshadow>) => {
    const nowIso = new Date().toISOString();
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          foreshadows: (w.foreshadows ?? []).map((f) =>
            f.id === foreshadowId ? { ...f, ...patch, updatedAt: nowIso } : f,
          ),
          updatedAt: nowIso,
        };
      }),
    }));
  };

  const deleteForeshadow = (workId: string, foreshadowId: string) => {
    const nowIso = new Date().toISOString();
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => w.id === workId
        ? { ...w, foreshadows: (w.foreshadows ?? []).filter((f) => f.id !== foreshadowId), updatedAt: nowIso }
        : w),
    }));
  };

  const updateIdea = (workId: string, ideaId: string, patch: { content: string }) => {
    const nowIso = new Date().toISOString();
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          ideas: w.ideas.map((i) => i.id === ideaId ? { ...i, content: patch.content } : i),
          updatedAt: nowIso,
        };
      }),
    }));
  };

  const deleteIdea = (workId: string, ideaId: string) => {
    const nowIso = new Date().toISOString();
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => w.id === workId
        ? { ...w, ideas: w.ideas.filter((i) => i.id !== ideaId), updatedAt: nowIso }
        : w),
    }));
  };

  const addIdea = (content: string) => {
    if (!activeWork) return;
    const workId = activeWork.id;
    const anchor = pendingIdeaAnchorRef.current ?? undefined;
    pendingIdeaAnchorRef.current = null;
    const idea = {
      id: crypto.randomUUID(),
      content,
      linkHint: activeChapter?.title ?? '',
      createdAt: new Date().toISOString(),
      anchor,
    };
    updateData((c) => ({ ...c, works: c.works.map((w) => w.id === workId ? { ...w, ideas: [idea, ...w.ideas], updatedAt: new Date().toISOString() } : w) }));
  };

  const addRelation = (fromId: string, toId: string, label: string) => {
    if (!activeWork) return;
    const workId = activeWork.id;
    const rel = { id: crypto.randomUUID(), fromLoreId: fromId, toLoreId: toId, label };
    updateData((c) => ({ ...c, works: c.works.map((w) => w.id === workId ? { ...w, relations: [...w.relations, rel] } : w) }));
  };

  const removeRelation = (relId: string) => {
    if (!activeWork) return;
    const workId = activeWork.id;
    updateData((c) => ({ ...c, works: c.works.map((w) => w.id === workId ? { ...w, relations: w.relations.filter((r) => r.id !== relId) } : w) }));
  };

  const revealAssistantMessage = async (content: string) => {
    const chunks = splitMarkdownForReveal(content);
    let revealed = '';

    setStreamingAiContent('');

    for (const chunk of chunks) {
      revealed += chunk;
      setStreamingAiContent(revealed);
      await wait(STREAM_REVEAL_DELAY_MS);
    }

    return revealed;
  };

  const sendAiMessage = async (content: string) => {
    if (!activeWork || !activeChapter) return;

    const workId = activeWork.id;
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content,
      createdAt: new Date().toISOString(),
    };

    updateData((current) => ({
      ...current,
      works: current.works.map((work) => (
        work.id === workId
          ? { ...work, aiMessages: [...work.aiMessages, userMsg] }
          : work
      )),
    }));

    setIsAiSending(true);
    setStreamingAiContent('');
    const abort = new AbortController();
    aiAbortRef.current = abort;

    try {
      const provider = pickProvider(aiConfig);
      const status = await provider.getStatus();
      if (!status.available) {
        throw new Error(status.detail || `${status.label} 不可用`);
      }

      const selectionText = textareaRef.current
        ? textareaRef.current.value.slice(textareaRef.current.selectionStart, textareaRef.current.selectionEnd).trim() || null
        : null;

      const prompt = buildCodexWritingPrompt({
        request: content,
        work: activeWork,
        chapter: activeChapter,
        messages: [...activeWork.aiMessages, userMsg],
        selection: selectionText,
      });

      let finalContent = '';
      if (aiConfig.kind === 'openai_compat') {
        const result = await provider.sendChat({
          messages: [
            { role: 'system', content: '你是一名长篇小说写作助手，用简体中文回答；给作者直接可用的内容、改写或建议。' },
            { role: 'user', content: prompt },
          ],
          onDelta: (partial) => setStreamingAiContent(partial),
          signal: abort.signal,
        });
        finalContent = result.content;
      } else {
        const result = await provider.sendChat({
          messages: [{ role: 'user', content: prompt }],
          signal: abort.signal,
        });
        await revealAssistantMessage(result.content);
        finalContent = result.content;
      }

      const parsed = parseAssistantReply(finalContent);
      const mode = aiConfig.permissionMode;

      const proposals: Proposal[] = mode === 'query_only'
        ? []
        : parsed.proposals.map((p) => {
            if (mode === 'auto_all') return { ...p, status: 'accepted' as const };
            if (mode === 'auto_edit' && isLowRisk(p.payload.kind)) return { ...p, status: 'accepted' as const };
            return p;
          });

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: parsed.markdown || finalContent,
        createdAt: new Date().toISOString(),
        proposals: proposals.length > 0 ? proposals : undefined,
      };

      updateData((current) => ({
        ...current,
        works: current.works.map((work) => (
          work.id === workId
            ? { ...work, aiMessages: [...work.aiMessages, assistantMsg] }
            : work
        )),
      }));

      for (const p of proposals) {
        if (p.status === 'accepted') {
          applyProposalInWork(workId, assistantMsg.id, p.id);
        }
      }

      setProviderStatus((current) => ({ ...current, available: true, detail: current.detail }));
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const message = isAbort
        ? '已取消'
        : (error instanceof Error ? error.message : 'AI 调用失败');
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: isAbort ? '（请求已取消）' : `调用失败：${message}`,
        createdAt: new Date().toISOString(),
      };

      updateData((current) => ({
        ...current,
        works: current.works.map((work) => (
          work.id === workId
            ? { ...work, aiMessages: [...work.aiMessages, assistantMsg] }
            : work
        )),
      }));

      if (!isAbort) {
        setProviderStatus((current) => ({ ...current, available: false, detail: message }));
      }
    } finally {
      setStreamingAiContent('');
      setIsAiSending(false);
      aiAbortRef.current = null;
    }
  };

  const cancelAiRequest = () => {
    aiAbortRef.current?.abort();
  };

  const updateAppearance = (update: Partial<{ theme: ThemeId; font: FontId; fontSize: FontSizeId }>) => {
    updateData((c) => ({
      ...c,
      preferences: { ...c.preferences, appearance: { ...c.preferences.appearance, ...update } },
    }));
  };

  const updateAiConfig = (next: AiProviderConfig) => {
    updateData((c) => ({
      ...c,
      preferences: { ...c.preferences, ai: next },
    }));
  };

  const applyPayloadToData = (
    current: AppData,
    workId: string,
    chapterId: string,
    cursorPos: number,
    msgId: string,
    proposalId: string,
  ): AppData => {
    const work = current.works.find((w) => w.id === workId);
    if (!work) return current;
    const msg = work.aiMessages.find((m) => m.id === msgId);
    const proposal = msg?.proposals?.find((p) => p.id === proposalId);
    if (!proposal) return current;

    const nowIso = new Date().toISOString();
    const updateProposalStatus = (status: Proposal['status'], failureReason?: string) => ({
      ...current,
      works: current.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          aiMessages: w.aiMessages.map((m) => {
            if (m.id !== msgId) return m;
            return {
              ...m,
              proposals: m.proposals?.map((p) => p.id === proposalId ? { ...p, status, failureReason } : p),
            };
          }),
        };
      }),
    });

    const payload = proposal.payload;

    const patchChapter = (base: AppData, patcher: (ch: Chapter) => Chapter): AppData => ({
      ...base,
      works: base.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          chapters: w.chapters.map((ch) => ch.id === chapterId ? patcher(ch) : ch),
          updatedAt: nowIso,
        };
      }),
    });

    let updated: AppData;
    try {
      switch (payload.kind) {
        case 'append_to_chapter': {
          updated = patchChapter(updateProposalStatus('accepted'), (ch) => {
            const nextContent = ch.content + (ch.content ? '\n\n' : '') + payload.text;
            return { ...ch, content: nextContent, wordCount: countChars(nextContent), updatedAt: nowIso };
          });
          break;
        }
        case 'insert_at_cursor': {
          const chapter = work.chapters.find((c) => c.id === chapterId);
          if (!chapter) return updateProposalStatus('failed', '找不到当前章节');
          const pos = Math.min(Math.max(cursorPos, 0), chapter.content.length);
          const nextContent = chapter.content.slice(0, pos) + payload.text + chapter.content.slice(pos);
          updated = patchChapter(updateProposalStatus('accepted'), (ch) => ({
            ...ch, content: nextContent, wordCount: countChars(nextContent), updatedAt: nowIso,
          }));
          break;
        }
        case 'replace_selection': {
          const chapter = work.chapters.find((c) => c.id === chapterId);
          if (!chapter) return updateProposalStatus('failed', '找不到当前章节');
          const idx = chapter.content.indexOf(payload.match);
          if (idx < 0) return updateProposalStatus('failed', '原文中找不到要替换的片段');
          const nextContent = chapter.content.slice(0, idx) + payload.text + chapter.content.slice(idx + payload.match.length);
          updated = patchChapter(updateProposalStatus('accepted'), (ch) => ({
            ...ch, content: nextContent, wordCount: countChars(nextContent), updatedAt: nowIso,
          }));
          break;
        }
        case 'add_lore': {
          const lore = {
            id: crypto.randomUUID(),
            type: payload.type,
            name: payload.name,
            description: payload.description,
            firstAppearanceChapterId: chapterId,
            tags: ['AI'],
            updatedAt: nowIso,
          };
          const base = updateProposalStatus('accepted');
          updated = {
            ...base,
            works: base.works.map((w) => w.id === workId ? { ...w, lore: [lore, ...w.lore], updatedAt: nowIso } : w),
          };
          break;
        }
        case 'add_idea': {
          const idea = {
            id: crypto.randomUUID(),
            content: payload.content,
            linkHint: 'AI 建议',
            createdAt: nowIso,
          };
          const base = updateProposalStatus('accepted');
          updated = {
            ...base,
            works: base.works.map((w) => w.id === workId ? { ...w, ideas: [idea, ...w.ideas], updatedAt: nowIso } : w),
          };
          break;
        }
        case 'update_outline': {
          updated = patchChapter(updateProposalStatus('accepted'), (ch) => ({ ...ch, outline: payload.outline, updatedAt: nowIso }));
          break;
        }
        case 'update_summary': {
          updated = patchChapter(updateProposalStatus('accepted'), (ch) => ({ ...ch, summary: payload.summary, updatedAt: nowIso }));
          break;
        }
      }
    } catch (error) {
      return updateProposalStatus('failed', error instanceof Error ? error.message : '应用失败');
    }
    return updated;
  };

  const applyProposalInWork = (workId: string, msgId: string, proposalId: string) => {
    const chapterId = activeChapter?.id ?? '';
    if (!chapterId) return;
    const cursor = textareaRef.current?.selectionStart ?? 0;
    const CONTENT_KINDS = new Set(['append_to_chapter', 'insert_at_cursor', 'replace_selection']);
    updateData((current) => {
      const work = current.works.find((w) => w.id === workId);
      const msg = work?.aiMessages.find((m) => m.id === msgId);
      const proposal = msg?.proposals?.find((p) => p.id === proposalId);
      let withSnapshot = current;
      if (proposal && CONTENT_KINDS.has(proposal.payload.kind) && work) {
        const chapter = work.chapters.find((c) => c.id === chapterId);
        if (chapter && chapter.content) {
          const snap: ChapterSnapshot = {
            id: crypto.randomUUID(),
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            content: chapter.content,
            wordCount: chapter.wordCount,
            createdAt: new Date().toISOString(),
          };
          withSnapshot = { ...current, snapshots: [snap, ...current.snapshots].slice(0, 100) };
        }
      }
      return applyPayloadToData(withSnapshot, workId, chapterId, cursor, msgId, proposalId);
    });
  };

  const rejectProposal = (workId: string, msgId: string, proposalId: string) => {
    updateData((current) => ({
      ...current,
      works: current.works.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          aiMessages: w.aiMessages.map((m) => {
            if (m.id !== msgId) return m;
            return {
              ...m,
              proposals: m.proposals?.map((p) => p.id === proposalId ? { ...p, status: 'rejected' } : p),
            };
          }),
        };
      }),
    }));
  };

  const openToolDrawer = (tab: PanelTab) => {
    setToolTab(tab);
    setOverlay('tools');
    updateData((c) => ({ ...c, preferences: { ...c.preferences, lastPanelTab: tab } }));
  };

  const clearTransientInputs = () => {
    setPaletteInitialQuery('');
    setInitialEditLoreId(null);
    setInitialEditForeshadowId(null);
    setDraftIdea('');
    setDraftAiInput('');
    pendingIdeaAnchorRef.current = null;
  };

  const closeAllPanels = () => {
    setEditorContextMenu(null);
    setOverlay('none');
    clearTransientInputs();
  };

  const toggleCommandPalette = () => {
    if (overlay === 'command') {
      closeAllPanels();
      return;
    }

    setEditorContextMenu(null);
    setPaletteInitialQuery('');
    setOverlay('command');
  };

  const pinMaterialToRightDock = (id: string) => {
    setRightDockItemIds((cur) => (cur.includes(id) ? cur : [...cur, id]));
    setRightDockActiveId(id);
    setRightDockVisible(true);
  };

  const closeRightDockTab = (id: string) => {
    setRightDockItemIds((cur) => {
      const next = cur.filter((x) => x !== id);
      setRightDockActiveId((active) => {
        if (active !== id) return active;
        return next.length > 0 ? next[next.length - 1] : null;
      });
      return next;
    });
  };

  const hideRightDock = () => setRightDockVisible(false);

  const clearRightDock = () => {
    setRightDockItemIds([]);
    setRightDockActiveId(null);
    setRightDockVisible(false);
  };

  const toggleRightDock = () => {
    if (rightDockItemIds.length === 0) return;
    setRightDockVisible((v) => !v);
  };

  const toggleChapterDrawer = () => {
    if (overlay === 'chapters') {
      closeAllPanels();
      return;
    }

    setEditorContextMenu(null);
    setOverlay('chapters');
  };

  const toggleToolDrawer = () => {
    if (overlay === 'tools') {
      closeAllPanels();
      return;
    }

    setEditorContextMenu(null);
    setOverlay('tools');
  };

  const reorderChapter = (chapterId: string, direction: 'up' | 'down') => {
    if (!activeWork) return;
    const workId = activeWork.id;
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => {
        if (w.id !== workId) return w;
        const chs = [...w.chapters];
        const i = chs.findIndex((ch) => ch.id === chapterId);
        if (i < 0) return w;
        const volumeId = chs[i].volumeId;
        let j = direction === 'up' ? i - 1 : i + 1;
        while (j >= 0 && j < chs.length && chs[j].volumeId !== volumeId) {
          j += direction === 'up' ? -1 : 1;
        }
        if (j < 0 || j >= chs.length) return w;
        [chs[i], chs[j]] = [chs[j], chs[i]];
        return { ...w, chapters: chs };
      }),
    }));
  };

  const createSnapshot = () => {
    if (!activeChapter || !activeChapter.content) return;
    const snap: ChapterSnapshot = {
      id: crypto.randomUUID(), chapterId: activeChapter.id, chapterTitle: activeChapter.title,
      content: activeChapter.content, wordCount: activeChapter.wordCount, createdAt: new Date().toISOString(),
    };
    updateData((c) => ({ ...c, snapshots: [snap, ...c.snapshots].slice(0, 100) }));
  };

  const restoreSnapshot = (snap: ChapterSnapshot) => {
    updateData((c) => ({
      ...c,
      works: c.works.map((w) => ({ ...w, chapters: w.chapters.map((ch) => ch.id === snap.chapterId ? { ...ch, content: snap.content, wordCount: snap.wordCount, updatedAt: new Date().toISOString() } : ch) })),
      preferences: { ...c.preferences, activeChapterId: snap.chapterId },
    }));
    setOverlay('none');
  };

  const handleExport = (format: 'txt' | 'md') => {
    if (!activeWork) return;
    const content = format === 'txt' ? exportToText(activeWork) : exportToMarkdown(activeWork);
    const ext = format === 'txt' ? 'txt' : 'md';
    downloadFile(content, `${activeWork.title}.${ext}`);
    setOverlay('none');
  };

  const applyChapterContent = (newContent: string, viaTyping = false) => {
    const oldCount = activeChapter?.wordCount ?? 0;
    const newCount = countChars(newContent);
    const delta = newCount - oldCount;
    if (viaTyping && delta > 0) {
      setTodayWords((w) => w + delta);
      recordTyping(delta);
    }
    updateChapter((ch) => ({ ...ch, content: newContent }));
    if (focusMode) requestAnimationFrame(() => updateFocusBand());
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const typed = lastInputTypedRef.current;
    lastInputTypedRef.current = false;
    applyChapterContent(e.target.value, typed);
  };

  const updateFocusBand = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const lineH = Number.parseFloat(window.getComputedStyle(ta).lineHeight) || 36;
    const lines = ta.value.substring(0, ta.selectionStart).split('\n').length;
    setFocusBandY(lines * lineH - ta.scrollTop);
  };

  const findMatches = useMemo<SearchMatch[]>(() => {
    const q = findQuery.trim();
    if (!findOpen || !q || !activeWork) return [];
    const needle = findCaseSensitive ? q : q.toLowerCase();
    const targets = findScope === 'chapter'
      ? (activeChapter ? [activeChapter] : [])
      : activeWork.chapters;
    const results: SearchMatch[] = [];
    const CONTEXT = 24;
    for (const ch of targets) {
      const hay = findCaseSensitive ? ch.content : ch.content.toLowerCase();
      let from = 0;
      while (from < hay.length) {
        const idx = hay.indexOf(needle, from);
        if (idx < 0) break;
        const snippetStart = Math.max(0, idx - CONTEXT);
        const snippetEnd = Math.min(ch.content.length, idx + q.length + CONTEXT);
        const snippet = ch.content.slice(snippetStart, snippetEnd).replace(/\n+/g, ' ');
        results.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          start: idx,
          end: idx + q.length,
          snippet,
          matchInSnippet: { start: idx - snippetStart, end: idx - snippetStart + q.length },
        });
        from = idx + q.length;
        if (results.length >= 500) return results;
      }
    }
    return results;
  }, [findOpen, findQuery, findCaseSensitive, findScope, activeWork, activeChapter]);

  const safeFindIdx = findMatches.length === 0
    ? 0
    : Math.min(findCurrentIdx, findMatches.length - 1);

  const jumpToMatch = (idx: number) => {
    const m = findMatches[idx];
    if (!m) return;
    setFindCurrentIdx(idx);
    const focusInChapter = () => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(m.start, m.end);
      requestAnimationFrame(() => {
        const caretTop = getTextareaCaretTop(ta, m.start);
        const target = caretTop - ta.clientHeight / 3;
        ta.scrollTop = Math.max(0, target);
      });
    };
    if (m.chapterId !== (activeChapter?.id ?? '')) {
      updateData((c) => ({ ...c, preferences: { ...c.preferences, activeChapterId: m.chapterId } }));
      requestAnimationFrame(focusInChapter);
    } else {
      focusInChapter();
    }
  };

  const focusMark = (mark: AnchorMark) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(mark.start, mark.end);
    requestAnimationFrame(() => {
      const caretTop = getTextareaCaretTop(ta, mark.start);
      const target = caretTop - ta.clientHeight / 3;
      ta.scrollTop = Math.max(0, target);
      if (annotationLayerRef.current) {
        annotationLayerRef.current.scrollTop = ta.scrollTop;
      }
      setAnnotationScrollTick((t) => t + 1);
    });
  };

  const openMark = (mark: AnchorMark) => {
    if (mark.foreshadowId) {
      setInitialEditForeshadowId(mark.foreshadowId);
      openToolDrawer('foreshadow');
    } else {
      openToolDrawer('ideas');
    }
  };

  useEffect(() => {
    if (!annotationMode) return;
    const onResize = () => setAnnotationScrollTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [annotationMode]);

  const openFind = (scope: FindScope, preset?: string) => {
    setFindScope(scope);
    if (preset !== undefined) {
      setFindQuery(preset);
      setFindCurrentIdx(0);
    }
    setFindOpen(true);
  };

  const closeFind = () => {
    setFindOpen(false);
    textareaRef.current?.focus();
  };

  const nextMatch = () => {
    if (findMatches.length === 0) return;
    jumpToMatch((safeFindIdx + 1) % findMatches.length);
  };

  const prevMatch = () => {
    if (findMatches.length === 0) return;
    jumpToMatch((safeFindIdx - 1 + findMatches.length) % findMatches.length);
  };

  const openChapterSearch = () => {
    const defaultQuery = normalizeSelectionText(editorContextMenu?.selectionText ?? '');
    openFind('chapter', defaultQuery);
    setEditorContextMenu(null);
  };

  const openWorkSearch = (preset: string) => {
    openFind('work', preset);
    setEditorContextMenu(null);
  };

  const openLoreDraftFromSelection = (selectionText: string) => {
    if (!activeWork) return;
    const normalized = normalizeSelectionText(selectionText);
    const fallbackType = activeWork.lore[0]?.type ?? '人物';
    const shortName = normalized.length > 14 ? `${normalized.slice(0, 14).trim()}…` : normalized;

    const id = createBlankLore(fallbackType);
    if (id) {
      updateLoreItem(activeWork.id, id, {
        name: shortName,
        description: `摘录自《${activeChapter?.title ?? '当前章节'}》：${normalized}`,
      });
      setInitialEditLoreId(id);
      openToolDrawer('lore');
    }
  };

  const openIdeaDraftFromSelection = (selectionText: string, selectionStart: number, selectionEnd: number) => {
    setDraftIdea(normalizeSelectionText(selectionText));
    if (activeChapter && selectionEnd > selectionStart) {
      pendingIdeaAnchorRef.current = buildAnchorFromSelection(activeChapter.id, selectionStart, selectionEnd, activeChapter.content);
    } else {
      pendingIdeaAnchorRef.current = null;
    }
    openToolDrawer('ideas');
  };

  const openForeshadowDraftFromSelection = (selectionText: string, selectionStart: number, selectionEnd: number) => {
    if (!activeWork || !activeChapter) return;
    const anchor = buildAnchorFromSelection(activeChapter.id, selectionStart, selectionEnd, activeChapter.content);
    const id = createBlankForeshadow(anchor);
    if (!id) return;
    const normalized = normalizeSelectionText(selectionText);
    const shortTitle = normalized.length > 18 ? `${normalized.slice(0, 18).trim()}…` : normalized;
    updateForeshadow(activeWork.id, id, { title: shortTitle });
    setInitialEditForeshadowId(id);
    openToolDrawer('foreshadow');
  };

  const openAiDraftFromSelection = (selectionText: string, mode: 'polish' | 'expand') => {
    const normalized = normalizeSelectionText(selectionText);
    const prompt = mode === 'polish'
      ? `请润色这段文字，保持原意、语气和人物口吻，不要明显扩写：\n\n「${normalized}」`
      : `请在保留剧情方向和语气的前提下扩写这段文字，让细节更饱满一些：\n\n「${normalized}」`;

    setDraftAiInput(prompt);
    openToolDrawer('ai');
  };

  const handleEditorContextMenu = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.preventDefault();

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    setEditorContextMenu({
      x: event.clientX,
      y: event.clientY,
      selectionStart,
      selectionEnd,
      selectionText: textarea.value.slice(selectionStart, selectionEnd),
    });
  };

  const runDocumentCommand = (command: 'undo' | 'redo') => {
    textareaRef.current?.focus();
    document.execCommand(command);
  };

  const copySelection = async (selectionText: string) => {
    try {
      await writeClipboardText(selectionText);
    } catch {
      window.alert('复制暂时不可用，请试试快捷键 Ctrl+C');
    }
  };

  const cutSelection = async (selectionStart: number, selectionEnd: number, selectionText: string) => {
    if (!activeChapter || !selectionText) {
      return;
    }

    try {
      await writeClipboardText(selectionText);
    } catch {
      window.alert('剪切暂时不可用，请试试快捷键 Ctrl+X');
      return;
    }

    setPendingSelection(selectionStart);
    applyChapterContent(`${activeChapter.content.slice(0, selectionStart)}${activeChapter.content.slice(selectionEnd)}`);
  };

  const pasteAtSelection = async (selectionStart: number, selectionEnd: number) => {
    if (!activeChapter) {
      return;
    }

    try {
      const pastedText = await readClipboardText();
      if (!pastedText) {
        return;
      }

      const nextContent = `${activeChapter.content.slice(0, selectionStart)}${pastedText}${activeChapter.content.slice(selectionEnd)}`;
      const nextCaret = selectionStart + pastedText.length;
      setPendingSelection(nextCaret);
      applyChapterContent(nextContent);
    } catch {
      window.alert('粘贴暂时不可用，请试试快捷键 Ctrl+V');
    }
  };

  const selectAllContent = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    focusEditorSelection(0, textarea.value.length);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab'
      && !event.ctrlKey && !event.metaKey && !event.altKey
      && !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      const textarea = event.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;
      const INDENT = '\u3000\u3000';
      if (event.shiftKey) {
        // Dedent: drop one leading full-width (or two half-width) space pair from the current line.
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const head = value.slice(lineStart, lineStart + 2);
        let stripLen = 0;
        if (head === INDENT) stripLen = 2;
        else if (head === '  ') stripLen = 2;
        else if (value[lineStart] === '\u3000' || value[lineStart] === '\t' || value[lineStart] === ' ') stripLen = 1;
        if (stripLen === 0) return;
        const nextContent = value.slice(0, lineStart) + value.slice(lineStart + stripLen);
        const caretShift = Math.max(0, selectionStart - lineStart >= stripLen ? stripLen : selectionStart - lineStart);
        setPendingSelection(selectionStart - caretShift, selectionEnd - caretShift);
        applyChapterContent(nextContent);
        return;
      }
      const nextContent = `${value.slice(0, selectionStart)}${INDENT}${value.slice(selectionEnd)}`;
      const nextCaret = selectionStart + INDENT.length;
      setPendingSelection(nextCaret);
      applyChapterContent(nextContent);
      return;
    }

    if (
      event.key !== 'Enter'
      || event.shiftKey
      || event.ctrlKey
      || event.metaKey
      || event.altKey
      || event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const previousChar = value[selectionStart - 1];
    const nextChar = value[selectionEnd];
    const insertion = previousChar === '\n' || nextChar === '\n' ? '\n' : '\n\n';
    const nextContent = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`;
    const nextCaret = selectionStart + insertion.length;

    setPendingSelection(nextCaret);
    applyChapterContent(nextContent);
  };

  useEffect(() => {
    const pendingSelection = pendingSelectionRef.current;
    const textarea = textareaRef.current;

    if (!pendingSelection || !textarea) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(pendingSelection.start, pendingSelection.end);
    pendingSelectionRef.current = null;

    if (focusMode) {
      requestAnimationFrame(() => updateFocusBand());
    }
  }, [activeChapter?.content, focusMode]);

  useEffect(() => {
    if (!editorContextMenu) {
      return;
    }

    const handleResize = () => setEditorContextMenu(null);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [editorContextMenu]);

  const handleGlobalKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (findOpen) { closeFind(); return; }
      closeAllPanels();
      return;
    }

    if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      setFocusMode((f) => !f);
      return;
    }

    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      setAnnotationMode((m) => !m);
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key === 'k' || e.key === 'p') { e.preventDefault(); toggleCommandPalette(); }
    else if (e.key === '/' && !e.shiftKey) { e.preventDefault(); toggleChapterDrawer(); }
    else if (e.key === '.') { e.preventDefault(); toggleToolDrawer(); }
    else if (e.key === '\\') { e.preventDefault(); setLeftDockOpen((v) => !v); }
    else if (e.key === 'j' || e.key === 'J') { e.preventDefault(); toggleRightDock(); }
    else if ((e.key === 'o' || e.key === 'O') && e.shiftKey) {
      e.preventDefault();
      setOverlay((cur) => cur === 'works' ? 'none' : 'works');
    }
    else if (e.key === 's') { e.preventDefault(); if (dataRef.current) void persistData(dataRef.current); }
    else if ((e.key === 'f' || e.key === 'F') && e.shiftKey) {
      e.preventDefault();
      const ta = textareaRef.current;
      const sel = ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : '';
      openFind('work', sel.trim() || findQuery);
    }
    else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      const ta = textareaRef.current;
      const sel = ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : '';
      openFind('chapter', sel.trim() || findQuery);
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleGlobalKeyDown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const rightDockItems = useMemo(() => {
    const all = data?.library?.items ?? [];
    const map = new Map(all.map((it) => [it.id, it] as const));
    return rightDockItemIds.map((id) => map.get(id)).filter((it): it is LibraryItem => Boolean(it));
  }, [data?.library?.items, rightDockItemIds]);
  const rightDockAssetMap = useMemo(() => {
    const m = new Map<string, AssetRecord>();
    for (const a of data?.assets ?? []) m.set(a.id, a);
    return m;
  }, [data?.assets]);

  useEffect(() => {
    if (rightDockItems.length === 0) return;
    if (!rightDockActiveId || !rightDockItems.some((it) => it.id === rightDockActiveId)) {
      setRightDockActiveId(rightDockItems[rightDockItems.length - 1].id);
    }
  }, [rightDockItems, rightDockActiveId]);

  if (!data || !activeWork || !activeChapter) {
    return <div className="loading">正在打开写作空间...</div>;
  }

  const closeOverlay = () => closeAllPanels();

  const contextSelection = normalizeSelectionText(editorContextMenu?.selectionText ?? '');
  const hasContextSelection = contextSelection.length > 0;
  const contextMenuEntries = hasContextSelection
    ? [
        {
          id: 'cut',
          type: 'item' as const,
          label: '剪切',
          hint: 'Ctrl+X',
          onSelect: () => {
            if (!editorContextMenu) return;
            void cutSelection(editorContextMenu.selectionStart, editorContextMenu.selectionEnd, editorContextMenu.selectionText);
          },
        },
        {
          id: 'copy',
          type: 'item' as const,
          label: '复制',
          hint: 'Ctrl+C',
          onSelect: () => void copySelection(editorContextMenu?.selectionText ?? ''),
        },
        {
          id: 'paste',
          type: 'item' as const,
          label: '粘贴',
          hint: 'Ctrl+V',
          onSelect: () => {
            if (!editorContextMenu) return;
            void pasteAtSelection(editorContextMenu.selectionStart, editorContextMenu.selectionEnd);
          },
        },
        { id: 'sep-1', type: 'separator' as const },
        {
          id: 'search-work',
          type: 'item' as const,
          label: '搜索全文中的这段词',
          onSelect: () => openWorkSearch(contextSelection),
        },
        {
          id: 'add-lore',
          type: 'item' as const,
          label: '加入设定库',
          onSelect: () => openLoreDraftFromSelection(contextSelection),
        },
        {
          id: 'add-idea',
          type: 'item' as const,
          label: '加入灵感（锚定此段）',
          onSelect: () => {
            if (!editorContextMenu) return;
            openIdeaDraftFromSelection(
              editorContextMenu.selectionText,
              editorContextMenu.selectionStart,
              editorContextMenu.selectionEnd,
            );
          },
        },
        {
          id: 'add-foreshadow',
          type: 'item' as const,
          label: '在此埋下伏笔',
          onSelect: () => {
            if (!editorContextMenu) return;
            openForeshadowDraftFromSelection(
              editorContextMenu.selectionText,
              editorContextMenu.selectionStart,
              editorContextMenu.selectionEnd,
            );
          },
        },
        { id: 'sep-2', type: 'separator' as const },
        {
          id: 'ai-polish',
          type: 'item' as const,
          label: '润色这段',
          onSelect: () => openAiDraftFromSelection(contextSelection, 'polish'),
        },
        {
          id: 'ai-expand',
          type: 'item' as const,
          label: '扩写这段',
          onSelect: () => openAiDraftFromSelection(contextSelection, 'expand'),
        },
      ]
    : [
        {
          id: 'undo',
          type: 'item' as const,
          label: '撤销',
          hint: 'Ctrl+Z',
          onSelect: () => runDocumentCommand('undo'),
        },
        {
          id: 'redo',
          type: 'item' as const,
          label: '重做',
          hint: 'Ctrl+Y',
          onSelect: () => runDocumentCommand('redo'),
        },
        {
          id: 'paste',
          type: 'item' as const,
          label: '粘贴',
          hint: 'Ctrl+V',
          onSelect: () => {
            if (!editorContextMenu) return;
            void pasteAtSelection(editorContextMenu.selectionStart, editorContextMenu.selectionEnd);
          },
        },
        {
          id: 'select-all',
          type: 'item' as const,
          label: '全选',
          hint: 'Ctrl+A',
          onSelect: selectAllContent,
        },
        { id: 'sep-3', type: 'separator' as const },
        {
          id: 'search-chapter',
          type: 'item' as const,
          label: '搜索本章',
          onSelect: openChapterSearch,
        },
        {
          id: 'open-chapters',
          type: 'item' as const,
          label: '打开章节列表',
          hint: 'Ctrl+/',
          onSelect: toggleChapterDrawer,
        },
      ];
  const saveLabel = saveState === 'saved' ? `已保存 ${saveTime}` : saveState === 'saving' ? '保存中...' : saveState === 'error' ? '保存失败' : '';

  const showAnnotation = annotationMode && !focusMode;
  const showLeftDock = leftDockOpen && !focusMode;
  const showRightDock = rightDockItems.length > 0 && rightDockVisible && !focusMode;

  return (
    <div
      className={`app${overlay !== 'none' ? ' has-overlay' : ''}${showLeftDock ? ' is-left-docked' : ''}${showRightDock ? ' is-right-docked' : ''}`}
      style={{ '--right-dock-w': `${rightDockWidth}px` } as React.CSSProperties}
    >
      <TitleBar onOpenAppearance={() => setOverlay('appearance')} />

      {showLeftDock && activeWork && (
        <LeftDock
          work={activeWork}
          chapter={activeChapter ?? null}
          tab={leftDockTab}
          onTabChange={setLeftDockTab}
          onUpdateOutline={(o) => updateChapter((ch) => ({ ...ch, outline: o }))}
          onSelectChapter={(id) => selectChapter(id)}
          onClose={() => setLeftDockOpen(false)}
        />
      )}

      {showRightDock && (
        <RightDock
          items={rightDockItems}
          activeId={rightDockActiveId}
          assetMap={rightDockAssetMap}
          width={rightDockWidth}
          onWidthChange={(w) => {
            setRightDockWidth(w);
            try { window.localStorage.setItem('rightDockWidth', String(w)); } catch {}
          }}
          onSelectTab={(id) => setRightDockActiveId(id)}
          onCloseTab={closeRightDockTab}
          onClose={hideRightDock}
          onEdit={() => setOverlay('library')}
        />
      )}

      <main className="writing-stage">
        <div className={`manuscript${showAnnotation ? ' is-annotated' : ''}`} ref={manuscriptRef}>
          <input
            className="chapter-title"
            value={activeChapter.title}
            onChange={(e) => updateChapter((ch) => ({ ...ch, title: e.target.value }))}
            spellCheck={false}
          />
          <div className={`editor-wrapper${showAnnotation ? ' is-annotated' : ''}`}>
            {showAnnotation && (
              <InlineAnnotationLayer
                ref={annotationLayerRef}
                content={activeChapter.content}
                marks={annotationMarks}
              />
            )}
            <textarea
              ref={textareaRef}
              className="chapter-content"
              value={activeChapter.content}
              onChange={handleContentChange}
              onContextMenu={handleEditorContextMenu}
              onKeyDown={handleEditorKeyDown}
              onSelect={() => { if (focusMode) updateFocusBand(); }}
              onScroll={(e) => {
                if (focusMode) updateFocusBand();
                if (annotationLayerRef.current) {
                  annotationLayerRef.current.scrollTop = e.currentTarget.scrollTop;
                }
                if (showAnnotation) {
                  setAnnotationScrollTick((t) => t + 1);
                }
              }}
              placeholder="落笔处..."
              spellCheck={false}
              autoFocus
            />
            {focusMode && focusBandY >= 0 && (
              <div className="focus-mask" style={{ '--band-y': `${focusBandY}px` } as React.CSSProperties} />
            )}
          </div>
          {showAnnotation && (
            <AnnotationMargin
              marks={annotationMarks}
              layerRef={annotationLayerRef}
              anchorRef={manuscriptRef}
              scrollTick={annotationScrollTick}
              onFocusMark={focusMark}
              onOpenMark={openMark}
            />
          )}
        </div>
      </main>

      <footer className="status-bar">
        <button className="status-btn" type="button" onClick={toggleChapterDrawer}>
          {activeWork.title} · {activeChapter.title}
        </button>
        <span className="status-spacer" />
        <span className="status-text status-stat status-stat-count">{activeChapter.wordCount.toLocaleString()} 字</span>
        <span className="status-dot-sep" />
        <span className="status-text status-stat status-stat-speed">{writingSpeed} 字/分</span>
        <span className="status-dot-sep" />
        <span className="status-text status-stat status-stat-today">今日 +{todayWords}</span>
        <span className="status-dot-sep" />
        <span className={`status-led ${saveState}`} />
        <span className="status-text">{saveLabel}</span>
        <span className="status-spacer" />
        {focusMode && <span className="status-badge">专注</span>}
        <button
          className={`status-btn${showLeftDock ? ' is-active' : ''}`}
          type="button"
          onClick={() => setLeftDockOpen((v) => !v)}
          title="章纲 / 卷纲 导航（Ctrl+\）"
        >导航</button>
        <span className="status-dot-sep" />
        <button
          className={`status-btn${showAnnotation ? ' is-active' : ''}`}
          type="button"
          onClick={() => setAnnotationMode((m) => !m)}
          title="显示本章锚点（Alt+A）"
        >锚点</button>
        <span className="status-dot-sep" />
        <button
          className="status-btn"
          type="button"
          onClick={() => setOverlay((cur) => (cur === 'library' ? 'none' : 'library'))}
          title="素材库（管理全部素材）"
        >素材库</button>
        <span className="status-dot-sep" />
        {rightDockItems.length > 0 && (
          <>
            <button
              className={`status-btn${showRightDock ? ' is-active' : ''}`}
              type="button"
              onClick={toggleRightDock}
              onContextMenu={(e) => { e.preventDefault(); clearRightDock(); }}
              title={showRightDock ? '隐藏素材面板 (Ctrl+J) · 右键清空所有 tab' : '显示素材面板 (Ctrl+J) · 右键清空所有 tab'}
            >素材面板 · {rightDockItems.length}</button>
            <span className="status-dot-sep" />
          </>
        )}
        <button className="status-btn" type="button" onClick={toggleCommandPalette}>⌘K</button>
        <span className="status-dot-sep" />
        <button className="status-btn" type="button" onClick={toggleToolDrawer}>工具</button>
      </footer>

      {overlay !== 'none' && overlay !== 'works' && overlay !== 'library' && (
        <div
          className={overlay === 'appearance' ? 'overlay-backdrop overlay-backdrop-subtle' : 'overlay-backdrop'}
          onClick={closeOverlay}
          role="presentation"
        />
      )}

      {overlay === 'command' && (
        <CommandPalette
          works={data.works} activeWork={activeWork} activeChapterId={activeChapter.id} snapshots={data.snapshots}
          library={data.library ?? { collections: [], items: [] }}
          rightDockOpen={showRightDock}
          initialQuery={paletteInitialQuery}
          onSelectChapter={(id) => { selectChapter(id); closeOverlay(); }}
          onSelectWork={(id) => { selectWork(id); closeOverlay(); }}
          onOpenDrawer={({ drawer, tab }) => {
            if (drawer === 'chapters') {
              setOverlay('chapters');
              return;
            }

            openToolDrawer(tab ?? 'outline');
          }}
          onOpenOverlay={(name) => setOverlay(name)}
          onExport={handleExport}
          onCreateSnapshot={() => { createSnapshot(); closeOverlay(); }}
          onRestoreSnapshot={(s) => { restoreSnapshot(s); closeOverlay(); }}
          onPinMaterial={(id) => { pinMaterialToRightDock(id); closeOverlay(); }}
          onCloseRightDock={() => { hideRightDock(); closeOverlay(); }}
          onClose={closeOverlay}
        />
      )}

      {overlay === 'chapters' && (
        <ChapterDrawer
          works={data.works} activeWork={activeWork} activeChapterId={activeChapter.id} snapshots={data.snapshots}
          onSelectChapter={(id) => { selectChapter(id); closeOverlay(); }}
          onAddChapter={(t, volumeId) => { addChapter(t, volumeId); closeOverlay(); }}
          onAddVolume={(t) => { addVolume(t); }}
          onRenameVolume={renameVolume}
          onReorderChapter={reorderChapter}
          onReorderVolume={reorderVolume}
          onMoveChapterToVolume={moveChapterToVolume}
          onDeleteChapter={deleteChapter}
          onDeleteVolume={deleteVolume}
          onRestoreSnapshot={restoreSnapshot}
          onOpenWorksLibrary={() => setOverlay('works')}
          onClose={closeOverlay}
        />
      )}

      {overlay === 'tools' && (
        <ToolDrawer
          work={activeWork} chapter={activeChapter} tab={toolTab}
          assets={data.assets ?? []}
          initialEditLoreId={initialEditLoreId}
          initialEditForeshadowId={initialEditForeshadowId}
          initialIdeaDraft={draftIdea}
          initialAiDraft={draftAiInput}
          providerStatus={providerStatus}
          isAiSending={isAiSending}
          streamingAiContent={streamingAiContent}
          onTabChange={openToolDrawer}
          onUpdateOutline={(o) => updateChapter((ch) => ({ ...ch, outline: o }))}
          onUpdateSummary={(s) => updateChapter((ch) => ({ ...ch, summary: s }))}
          onCreateBlankLore={createBlankLore}
          onUpdateLore={(loreId, patch) => updateLoreItem(activeWork.id, loreId, patch)}
          onDeleteLore={(loreId) => deleteLoreItem(activeWork.id, loreId)}
          onCreateBlankForeshadow={createBlankForeshadow}
          onUpdateForeshadow={(fid, patch) => updateForeshadow(activeWork.id, fid, patch)}
          onDeleteForeshadow={(fid) => deleteForeshadow(activeWork.id, fid)}
          onUpdateSynopsis={(s) => updateWorkMeta(activeWork.id, { synopsis: s })}
          onAddAsset={addAsset}
          onAddIdea={addIdea}
          onUpdateIdea={(ideaId, patch) => updateIdea(activeWork.id, ideaId, patch)}
          onDeleteIdea={(ideaId) => deleteIdea(activeWork.id, ideaId)}
          onSendAiMessage={sendAiMessage}
          onCancelAiMessage={cancelAiRequest}
          onApplyProposal={(msgId, proposalId) => applyProposalInWork(activeWork.id, msgId, proposalId)}
          onRejectProposal={(msgId, proposalId) => rejectProposal(activeWork.id, msgId, proposalId)}
          onOpenGraph={() => setOverlay('graph')}
          onOpenAiSettings={() => setOverlay('ai-settings')}
          onClose={closeOverlay}
        />
      )}

      {overlay === 'stats' && (
        <StatsOverlay
          work={activeWork} dailyRecords={data.dailyRecords} dailyTarget={data.metrics.dailyTarget}
          streakDays={data.metrics.streakDays} todayWords={todayWords} onClose={closeOverlay}
        />
      )}

      {overlay === 'graph' && (
        <RelationGraph
          lore={activeWork.lore} relations={activeWork.relations}
          onAddRelation={addRelation} onRemoveRelation={removeRelation} onClose={closeOverlay}
        />
      )}

      {overlay === 'appearance' && (
        <AppearanceSettings
          theme={data.preferences.appearance.theme}
          font={data.preferences.appearance.font}
          fontSize={data.preferences.appearance.fontSize}
          onChangeTheme={(t) => updateAppearance({ theme: t })}
          onChangeFont={(f) => updateAppearance({ font: f })}
          onChangeFontSize={(s) => updateAppearance({ fontSize: s })}
          onClose={closeOverlay}
        />
      )}

      {overlay === 'ai-settings' && (
        <AiSettings
          config={aiConfig}
          onChange={updateAiConfig}
          onClose={closeOverlay}
        />
      )}

      {overlay === 'works' && (
        <WorksLibrary
          works={data.works}
          assets={data.assets ?? []}
          activeWorkId={activeWork.id}
          onOpenWork={(id) => { selectWork(id); closeOverlay(); }}
          onAddWork={(t) => addWork(t)}
          onImportWork={(preview, overrides) => importWork(preview, overrides)}
          onUpdateMeta={(id, patch) => updateWorkMeta(id, patch)}
          onAddAsset={addAsset}
          onDeleteWork={(id) => deleteWork(id)}
          onClose={closeOverlay}
        />
      )}

      {overlay === 'library' && (
        <LibraryView
          library={data.library ?? { collections: [], items: [] }}
          assets={data.assets ?? []}
          onAddCollection={addLibraryCollection}
          onRenameCollection={renameLibraryCollection}
          onDeleteCollection={deleteLibraryCollection}
          onCreateItem={createLibraryItem}
          onUpdateItem={updateLibraryItem}
          onDeleteItem={deleteLibraryItem}
          onImportFiles={importLibraryFiles}
          onImportClipboard={importLibraryClipboard}
          onPinToSide={pinMaterialToRightDock}
          onClose={closeOverlay}
        />
      )}

      {editorContextMenu && (
        <EditorContextMenu
          x={editorContextMenu.x}
          y={editorContextMenu.y}
          entries={contextMenuEntries}
          onClose={() => setEditorContextMenu(null)}
        />
      )}

      {findOpen && (
        <FindBar
          query={findQuery}
          scope={findScope}
          caseSensitive={findCaseSensitive}
          matches={findMatches}
          currentIdx={safeFindIdx}
          onQueryChange={(q) => { setFindQuery(q); setFindCurrentIdx(0); }}
          onScopeChange={(s) => { setFindScope(s); setFindCurrentIdx(0); }}
          onToggleCase={() => setFindCaseSensitive((v) => !v)}
          onPrev={prevMatch}
          onNext={nextMatch}
          onJump={jumpToMatch}
          onClose={closeFind}
        />
      )}
    </div>
  );
}

export default App;
