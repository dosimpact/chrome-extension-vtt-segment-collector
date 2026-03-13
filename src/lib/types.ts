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

export type SessionStatus = 'idle' | 'detecting' | 'ready' | 'collecting' | 'stopped';

export type TabSession = {
  tabId: number;
  autoDetect: boolean;
  detectionEnabled: boolean;
  status: SessionStatus;
  captions: CaptionBuffer;
  lastError: string | null;
};

export type PopupState = {
  tabId: number | null;
  isSupported: boolean;
  session: TabSession | null;
};

export type DownloadFormat = 'txt' | 'vtt';

export type RuntimeMessage =
  | { type: 'VTT_SEGMENT'; payload: { url: string; text: string; contentType?: string; tabId?: number } }
  | { type: 'ENSURE_INJECTION' }
  | { type: 'GET_POPUP_STATE'; payload: { tabId: number | null } }
  | { type: 'START_DETECTION'; payload: { tabId: number } }
  | { type: 'STOP_DETECTION'; payload: { tabId: number } }
  | { type: 'SET_AUTO_DETECT'; payload: { tabId: number; enabled: boolean } }
  | { type: 'CLEAR_CAPTIONS'; payload: { tabId: number } }
  | { type: 'DOWNLOAD_CAPTIONS'; payload: { tabId: number; format: DownloadFormat } };

export type SessionAction =
  | { type: 'SET_AUTO_DETECT'; payload: { enabled: boolean } }
  | { type: 'START_DETECTION' }
  | { type: 'STOP_DETECTION' }
  | { type: 'SET_ERROR'; payload: { message: string } }
  | { type: 'CLEAR_CAPTIONS' }
  | { type: 'SEGMENT_CAPTURED'; payload: { url: string; text: string; contentType?: string } };
