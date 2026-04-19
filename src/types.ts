export type WorkStatus = 'drafting' | 'serializing' | 'paused';
export type ChapterStatus = 'draft' | 'revising' | 'queued';
export type WorkspaceView = 'dashboard' | 'works' | 'editor' | 'lore';
export type PanelTab = 'outline' | 'lore' | 'ideas' | 'foreshadow' | 'ai';

export type ForeshadowState = 'planted' | 'echoed' | 'paid_off';
export type LoreType = '人物' | '地点' | '势力' | '规则' | '线索';
export type ThemeId = 'warm' | 'cool' | 'dark' | 'green' | 'rose';
export type FontId = 'serif' | 'sans' | 'kai' | 'mono';
export type FontSizeId = 'small' | 'medium' | 'large' | 'xlarge';

export interface CodexStatus {
  available: boolean;
  version: string;
  detail?: string;
}

export interface CodexResponse {
  content: string;
  version: string;
}

export type AiProviderKind = 'codex' | 'openai_compat';

export type AiPermissionMode = 'query_only' | 'suggest' | 'auto_edit' | 'auto_all';

export interface AiProviderConfig {
  kind: AiProviderKind;
  openaiCompat: {
    baseUrl: string;
    model: string;
    temperature: number;
    providerLabel: string;
  };
  permissionMode: AiPermissionMode;
}

export interface AiProviderStatus {
  kind: AiProviderKind;
  available: boolean;
  label: string;
  detail?: string;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  outline: string;
  content: string;
  status: ChapterStatus;
  linkedLoreIds: string[];
  wordCount: number;
  updatedAt: string;
  volumeId?: string;
}

export interface Volume {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoreItem {
  id: string;
  type: LoreType;
  name: string;
  description: string;
  firstAppearanceChapterId: string;
  tags: string[];
  updatedAt: string;
  imageAssetId?: string;
  aliases?: string[];
  attributes?: LoreAttributes;
}

export interface CharacterRelation {
  id: string;
  fromLoreId: string;
  toLoreId: string;
  label: string;
}

export interface IdeaNote {
  id: string;
  content: string;
  linkHint: string;
  createdAt: string;
  anchor?: Anchor;
}

export interface Anchor {
  chapterId: string;
  excerpt: string;
  contextBefore: string;
  contextAfter: string;
  createdAt: string;
}

export interface ForeshadowStageRecord {
  at?: string;
  note: string;
  anchor?: Anchor;
}

export interface Foreshadow {
  id: string;
  title: string;
  description: string;
  state: ForeshadowState;
  planted?: ForeshadowStageRecord;
  echoed?: ForeshadowStageRecord;
  paidOff?: ForeshadowStageRecord;
  linkedLoreIds: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  proposals?: Proposal[];
}

export type ProposalKind =
  | 'append_to_chapter'
  | 'insert_at_cursor'
  | 'replace_selection'
  | 'add_lore'
  | 'add_idea'
  | 'update_outline'
  | 'update_summary';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'failed';

export interface AppendToChapterProposal { kind: 'append_to_chapter'; text: string; }
export interface InsertAtCursorProposal { kind: 'insert_at_cursor'; text: string; cursorHint?: string; }
export interface ReplaceSelectionProposal { kind: 'replace_selection'; match: string; text: string; }
export interface AddLoreProposal { kind: 'add_lore'; type: LoreType; name: string; description: string; }
export interface AddIdeaProposal { kind: 'add_idea'; content: string; }
export interface UpdateOutlineProposal { kind: 'update_outline'; outline: string; }
export interface UpdateSummaryProposal { kind: 'update_summary'; summary: string; }

export type ProposalPayload =
  | AppendToChapterProposal
  | InsertAtCursorProposal
  | ReplaceSelectionProposal
  | AddLoreProposal
  | AddIdeaProposal
  | UpdateOutlineProposal
  | UpdateSummaryProposal;

export interface Proposal {
  id: string;
  status: ProposalStatus;
  payload: ProposalPayload;
  failureReason?: string;
}

export interface WorkCover {
  emoji?: string;
  color?: string;
  imageAssetId?: string;
}

export interface AssetRecord {
  id: string;
  kind: 'image';
  mime: string;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  label?: string;
  tags?: string[];
}

export interface LoreAttributes {
  role?: string;
  age?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  scale?: string;
  region?: string;
  landscape?: string;
  atmosphere?: string;
  inhabitants?: string;
  nature?: string;
  leader?: string;
  territory?: string;
  creed?: string;
  methods?: string;
  relation?: string;
  scope?: string;
  principle?: string;
  cost?: string;
  taboo?: string;
  firstSeen?: string;
  surface?: string;
  truth?: string;
  linked?: string;
  payoff?: string;
  keyInfo?: string;
}

export interface Work {
  id: string;
  title: string;
  genre: string;
  status: WorkStatus;
  synopsis: string;
  updatedAt: string;
  createdAt?: string;
  cover?: WorkCover;
  chapters: Chapter[];
  volumes: Volume[];
  lore: LoreItem[];
  ideas: IdeaNote[];
  relations: CharacterRelation[];
  aiMessages: AiMessage[];
  foreshadows: Foreshadow[];
}

export type LibraryItemKind = '描写片段' | '知识参考' | '设定素材' | '灵感种子' | '图像参考';

export interface LibraryCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryItem {
  id: string;
  collectionId: string;
  kind: LibraryItemKind;
  title: string;
  body: string;
  imageAssetId?: string;
  tags: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Library {
  collections: LibraryCollection[];
  items: LibraryItem[];
}

export interface DailyRecord {
  date: string;
  wordsAdded: number;
}

export interface ChapterSnapshot {
  id: string;
  chapterId: string;
  chapterTitle: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

export interface AppData {
  works: Work[];
  metrics: {
    dailyTarget: number;
    streakDays: number;
  };
  preferences: {
    activeWorkId: string;
    activeChapterId: string;
    lastPanelTab: PanelTab;
    lastView: WorkspaceView;
    appearance: {
      theme: ThemeId;
      font: FontId;
      fontSize: FontSizeId;
    };
    ai?: AiProviderConfig;
  };
  metadata: {
    version: number;
    lastOpenedAt: string;
  };
  dailyRecords: DailyRecord[];
  snapshots: ChapterSnapshot[];
  assets: AssetRecord[];
  library?: Library;
}

declare global {
  interface Window {
    novelStudio?: {
      loadData: () => Promise<AppData | null>;
      saveData: (data: AppData) => Promise<{ savedAt: string }>;
      windowMinimize: () => Promise<boolean>;
      windowMaximize: () => Promise<boolean>;
      windowClose: () => Promise<boolean>;
      readClipboardText: () => Promise<string>;
      writeClipboardText: (text: string) => Promise<void>;
      getCodexStatus: () => Promise<CodexStatus>;
      runCodexPrompt: (payload: { prompt: string; requestId?: string }) => Promise<CodexResponse & { requestId?: string }>;
      cancelCodexPrompt: (requestId?: string) => Promise<boolean>;
      setSecret: (key: string, value: string) => Promise<boolean>;
      getSecret: (key: string) => Promise<string | null>;
      deleteSecret: (key: string) => Promise<boolean>;
      hasSecret: (key: string) => Promise<boolean>;
    };
  }
}
