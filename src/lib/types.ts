export type Cue = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export type CaptionBuffer = {
  cues: Cue[];
  cueMap: Record<string, true>;
  previewText: string;
  lastUpdatedAt: number;
};

export type CaptionLibraryEntry = {
  pageUrl: string;
  title: string;
  captions: CaptionBuffer;
  updatedAt: number;
};

export type CaptionLibraryMap = Record<string, CaptionLibraryEntry>;

export type SessionStatus = 'idle' | 'detecting' | 'ready' | 'collecting' | 'stopped';
export type CaptionFontSize = 'sm' | 'base' | 'lg';
export type CaptionFontWeight = 'normal' | 'medium' | 'semibold';

export type TabSession = {
  tabId: number;
  pageUrl: string | null;
  pageTitle: string | null;
  autoDetect: boolean;
  autoSaveLibrary: boolean;
  domExtractionEnabled: boolean;
  vttResponseAnalysisEnabled: boolean;
  captionFontSize: CaptionFontSize;
  captionFontWeight: CaptionFontWeight;
  detectionEnabled: boolean;
  hydratedLibraryUrl: string | null;
  status: SessionStatus;
  captions: CaptionBuffer;
  lastError: string | null;
};

export type PopupState = {
  tabId: number | null;
  isSupported: boolean;
  session: TabSession | null;
  library: CaptionLibraryEntry[];
};

export type DownloadFormat = 'txt' | 'vtt';

export type RuntimeMessage =
  | { type: 'VTT_SEGMENT'; payload: { url: string; text: string; contentType?: string; tabId?: number } }
  | { type: 'ENSURE_INJECTION' }
  | { type: 'GET_POPUP_STATE'; payload: { tabId: number | null } }
  | { type: 'START_DETECTION'; payload: { tabId: number } }
  | { type: 'STOP_DETECTION'; payload: { tabId: number } }
  | { type: 'SET_AUTO_DETECT'; payload: { tabId: number; enabled: boolean } }
  | { type: 'SET_AUTO_SAVE_LIBRARY'; payload: { tabId: number; enabled: boolean } }
  | { type: 'SET_DOM_EXTRACTION'; payload: { tabId: number; enabled: boolean } }
  | { type: 'SET_VTT_RESPONSE_ANALYSIS'; payload: { tabId: number; enabled: boolean } }
  | { type: 'SET_CAPTION_DISPLAY'; payload: { tabId: number; fontSize?: CaptionFontSize; fontWeight?: CaptionFontWeight } }
  | { type: 'CLEAR_CAPTIONS'; payload: { tabId: number } }
  | { type: 'DOWNLOAD_CAPTIONS'; payload: { tabId: number; format: DownloadFormat } }
  | { type: 'DOWNLOAD_LIBRARY_CAPTIONS'; payload: { pageUrl: string; format: DownloadFormat } }
  | { type: 'DOWNLOAD_ALL_LIBRARY_CAPTIONS'; payload: { format: DownloadFormat } }
  | { type: 'DELETE_LIBRARY_CAPTIONS'; payload: { pageUrl: string } };

export type SessionAction =
  | { type: 'SET_AUTO_DETECT'; payload: { enabled: boolean } }
  | { type: 'SET_AUTO_SAVE_LIBRARY'; payload: { enabled: boolean } }
  | { type: 'SET_DOM_EXTRACTION'; payload: { enabled: boolean } }
  | { type: 'SET_VTT_RESPONSE_ANALYSIS'; payload: { enabled: boolean } }
  | { type: 'SET_CAPTION_DISPLAY'; payload: { fontSize?: CaptionFontSize; fontWeight?: CaptionFontWeight } }
  | { type: 'SET_PAGE_CONTEXT'; payload: { pageUrl: string | null; pageTitle: string | null } }
  | { type: 'HYDRATE_CAPTIONS_FROM_LIBRARY'; payload: { pageUrl: string; captions: CaptionBuffer } }
  | { type: 'START_DETECTION' }
  | { type: 'STOP_DETECTION' }
  | { type: 'SET_ERROR'; payload: { message: string } }
  | { type: 'CLEAR_CAPTIONS' }
  | { type: 'SEGMENT_CAPTURED'; payload: { url: string; text: string; contentType?: string } };
