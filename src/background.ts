import { mergeCaptionLibraryEntry, sortCaptionLibraryEntries } from './lib/caption-library';
import { cuesToTxt, cuesToVtt } from './lib/subtitles';
import { decodeDebuggerBody } from './lib/debugger-body';
import { shouldCaptureResponseBody } from './lib/debugger-network';
import { createDownloadDataUrl } from './lib/download-url';
import { createEmptySession, reduceSessionMessage } from './lib/session-store';
import type { CaptionLibraryMap, PopupState, RuntimeMessage, TabSession } from './lib/types';

const sessions = new Map<number, TabSession>();
const debuggerTargets = new Set<number>();
const requestMap = new Map<string, { tabId: number; url: string; contentType?: string }>();
const AUTO_DETECT_STORAGE_KEY = 'autoDetectEnabled';
const AUTO_SAVE_LIBRARY_STORAGE_KEY = 'autoSaveLibraryEnabled';
const CAPTION_LIBRARY_STORAGE_KEY = 'captionLibrary';
let autoDetectDefault = true;
let autoSaveLibraryDefault = true;
let settingsLoadPromise: Promise<void> | null = null;
let libraryLoadPromise: Promise<void> | null = null;
let captionLibrary: CaptionLibraryMap = {};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get([AUTO_DETECT_STORAGE_KEY, AUTO_SAVE_LIBRARY_STORAGE_KEY]);
  const nextValues: Record<string, boolean> = {};

  if (typeof stored.autoDetectEnabled !== 'boolean') {
    nextValues[AUTO_DETECT_STORAGE_KEY] = true;
    autoDetectDefault = true;
  } else {
    autoDetectDefault = stored.autoDetectEnabled;
  }

  if (typeof stored.autoSaveLibraryEnabled !== 'boolean') {
    nextValues[AUTO_SAVE_LIBRARY_STORAGE_KEY] = true;
    autoSaveLibraryDefault = true;
  } else {
    autoSaveLibraryDefault = stored.autoSaveLibraryEnabled;
  }

  if (Object.keys(nextValues).length) {
    await chrome.storage.local.set(nextValues);
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleMessage(message, sender).then(sendResponse);
  return true;
});

chrome.debugger.onEvent.addListener((source, method, params) => {
  void handleDebuggerEvent(source, method, params as Record<string, unknown>);
});

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  await ensureSettingsLoaded();

  switch (message.type) {
    case 'GET_POPUP_STATE':
      return getPopupState(message.payload.tabId);
    case 'START_DETECTION':
      await ensureSessionContext(message.payload.tabId);
      updateSession(message.payload.tabId, { type: 'START_DETECTION' });
      try {
        await attachDebugger(message.payload.tabId);
      } catch (error) {
        updateSession(message.payload.tabId, {
          type: 'SET_ERROR',
          payload: { message: toErrorMessage(error) }
        });
      }
      return getPopupState(message.payload.tabId);
    case 'STOP_DETECTION':
      updateSession(message.payload.tabId, { type: 'STOP_DETECTION' });
      try {
        await detachDebugger(message.payload.tabId);
      } catch (error) {
        updateSession(message.payload.tabId, {
          type: 'SET_ERROR',
          payload: { message: toErrorMessage(error) }
        });
      }
      return getPopupState(message.payload.tabId);
    case 'SET_AUTO_DETECT':
      updateSession(message.payload.tabId, {
        type: 'SET_AUTO_DETECT',
        payload: { enabled: message.payload.enabled }
      });
      autoDetectDefault = message.payload.enabled;
      await chrome.storage.local.set({ [AUTO_DETECT_STORAGE_KEY]: message.payload.enabled });
      return getPopupState(message.payload.tabId);
    case 'SET_AUTO_SAVE_LIBRARY': {
      let session = await ensureSessionContext(message.payload.tabId);
      session = updateSession(message.payload.tabId, {
        type: 'SET_AUTO_SAVE_LIBRARY',
        payload: { enabled: message.payload.enabled }
      });
      autoSaveLibraryDefault = message.payload.enabled;
      await chrome.storage.local.set({ [AUTO_SAVE_LIBRARY_STORAGE_KEY]: message.payload.enabled });
      if (message.payload.enabled && session.pageUrl) {
        session = hydrateSessionFromLibrary(message.payload.tabId, session.pageUrl);
      }
      return getPopupState(message.payload.tabId);
    }
    case 'CLEAR_CAPTIONS':
      updateSession(message.payload.tabId, {
        type: 'CLEAR_CAPTIONS'
      });
      return getPopupState(message.payload.tabId);
    case 'DOWNLOAD_CAPTIONS':
      await downloadTrack(message.payload.tabId, message.payload.format);
      return getPopupState(message.payload.tabId);
    case 'DOWNLOAD_LIBRARY_CAPTIONS':
      await downloadLibraryEntry(message.payload.pageUrl, message.payload.format);
      return getPopupState(sender.tab?.id ?? null);
    case 'DELETE_LIBRARY_CAPTIONS':
      await deleteLibraryEntry(message.payload.pageUrl);
      return getPopupState(sender.tab?.id ?? null);
    case 'VTT_SEGMENT': {
      const tabId = sender.tab?.id ?? message.payload.tabId;
      if (!tabId) return { ok: false };
      const session = await ensureSessionContext(tabId, sender.tab);
      const autoEnabled = session.autoDetect;
      if (!session.detectionEnabled && !autoEnabled) {
        return { ok: false };
      }
      const nextSession = updateSession(tabId, {
        type: 'SEGMENT_CAPTURED',
        payload: {
          url: message.payload.url,
          text: message.payload.text,
          contentType: message.payload.contentType
        }
      });
      await persistSessionLibrary(tabId, nextSession);
      return { ok: true };
    }
    default:
      return { ok: false };
  }
}

async function getPopupState(tabId: number | null): Promise<PopupState> {
  await ensureLibraryLoaded();
  const session = tabId ? await ensureSessionContext(tabId) : null;

  return {
    tabId,
    isSupported: Boolean(tabId),
    session,
    library: sortCaptionLibraryEntries(captionLibrary)
  };
}

function getOrCreateSession(tabId: number): TabSession {
  const session = sessions.get(tabId);
  if (session) return session;
  const next = createEmptySession(tabId, autoDetectDefault, autoSaveLibraryDefault);
  sessions.set(tabId, next);
  return next;
}

async function ensureSettingsLoaded(): Promise<void> {
  if (!settingsLoadPromise) {
    settingsLoadPromise = chrome.storage.local
      .get([AUTO_DETECT_STORAGE_KEY, AUTO_SAVE_LIBRARY_STORAGE_KEY])
      .then(({ autoDetectEnabled = true, autoSaveLibraryEnabled = true }) => {
        autoDetectDefault = typeof autoDetectEnabled === 'boolean' ? autoDetectEnabled : true;
        autoSaveLibraryDefault = typeof autoSaveLibraryEnabled === 'boolean' ? autoSaveLibraryEnabled : true;
      });
  }

  await settingsLoadPromise;
}

async function ensureLibraryLoaded(): Promise<void> {
  if (!libraryLoadPromise) {
    libraryLoadPromise = chrome.storage.local.get(CAPTION_LIBRARY_STORAGE_KEY).then((stored) => {
      const value = stored[CAPTION_LIBRARY_STORAGE_KEY];
      captionLibrary = value && typeof value === 'object' ? (value as CaptionLibraryMap) : {};
    });
  }

  await libraryLoadPromise;
}

function updateSession(tabId: number, action: Parameters<typeof reduceSessionMessage>[1]): TabSession {
  const next = reduceSessionMessage(getOrCreateSession(tabId), action);
  sessions.set(tabId, next);
  return next;
}

async function downloadTrack(tabId: number, format: 'txt' | 'vtt'): Promise<void> {
  const captions = getOrCreateSession(tabId).captions;
  if (!captions.cues.length) return;
  await downloadCaptions(`captions-${tabId}`, captions.cues, format);
}

async function downloadLibraryEntry(pageUrl: string, format: 'txt' | 'vtt'): Promise<void> {
  await ensureLibraryLoaded();
  const entry = captionLibrary[pageUrl];
  if (!entry || !entry.captions.cues.length) return;
  await downloadCaptions(sanitizeFilename(entry.title || entry.pageUrl), entry.captions.cues, format);
}

async function downloadCaptions(filenameBase: string, cues: TabSession['captions']['cues'], format: 'txt' | 'vtt'): Promise<void> {
  const content = format === 'vtt' ? cuesToVtt(cues) : cuesToTxt(cues);
  const mimeType = format === 'vtt' ? 'text/vtt' : 'text/plain';
  const downloadUrl = createDownloadDataUrl(content, mimeType);
  await chrome.downloads.download({
    url: downloadUrl,
    filename: `${filenameBase}.${format}`,
    saveAs: true
  });
}

async function attachDebugger(tabId: number): Promise<void> {
  if (debuggerTargets.has(tabId)) return;
  const target: chrome.debugger.Debuggee = { tabId };
  await chrome.debugger.attach(target, '1.3');
  await chrome.debugger.sendCommand(target, 'Network.enable');
  debuggerTargets.add(tabId);
}

async function detachDebugger(tabId: number): Promise<void> {
  if (!debuggerTargets.has(tabId)) return;
  const target: chrome.debugger.Debuggee = { tabId };
  try {
    await chrome.debugger.detach(target);
  } catch {
    // Ignore already detached state.
  }
  debuggerTargets.delete(tabId);
  for (const [requestId, meta] of requestMap.entries()) {
    if (meta.tabId === tabId) requestMap.delete(requestId);
  }
}

async function handleDebuggerEvent(
  source: chrome.debugger.Debuggee,
  method: string,
  params: Record<string, unknown>
): Promise<void> {
  const tabId = source.tabId;
  if (!tabId || !debuggerTargets.has(tabId)) return;

  if (method === 'Network.responseReceived') {
    const requestId = typeof params.requestId === 'string' ? params.requestId : null;
    const response = typeof params.response === 'object' && params.response ? (params.response as Record<string, unknown>) : null;
    const url = typeof response?.url === 'string' ? response.url : null;
    const contentType = typeof response?.mimeType === 'string' ? response.mimeType : '';
    if (!requestId || !url) return;
    if (!shouldCaptureResponseBody(url, contentType)) {
      return;
    }
    requestMap.set(requestId, { tabId, url, contentType });
    return;
  }

  if (method === 'Network.loadingFinished') {
    const requestId = typeof params.requestId === 'string' ? params.requestId : null;
    if (!requestId) return;
    const meta = requestMap.get(requestId);
    if (!meta) return;
    requestMap.delete(requestId);

    try {
      const response = (await chrome.debugger.sendCommand(
        { tabId },
        'Network.getResponseBody',
        { requestId }
      )) as { body?: string; base64Encoded?: boolean };
      const text = decodeDebuggerBody(response.body ?? '', Boolean(response.base64Encoded));
      const nextSession = updateSession(tabId, {
        type: 'SEGMENT_CAPTURED',
        payload: {
          url: meta.url,
          text,
          contentType: meta.contentType
        }
      });
      await persistSessionLibrary(tabId, nextSession);
    } catch {
      // Ignore responses whose bodies are unavailable.
    }
  }
}

async function ensureSessionContext(tabId: number, tab?: chrome.tabs.Tab): Promise<TabSession> {
  await ensureLibraryLoaded();
  const tabInfo = tab ?? (await chrome.tabs.get(tabId).catch(() => null));
  const pageUrl = typeof tabInfo?.url === 'string' ? tabInfo.url : null;
  const pageTitle = typeof tabInfo?.title === 'string' ? tabInfo.title : null;
  const session = updateSession(tabId, {
    type: 'SET_PAGE_CONTEXT',
    payload: { pageUrl, pageTitle }
  });

  if (!pageUrl) return session;
  return hydrateSessionFromLibrary(tabId, pageUrl);
}

function hydrateSessionFromLibrary(tabId: number, pageUrl: string): TabSession {
  const session = getOrCreateSession(tabId);
  if (!session.autoSaveLibrary) return session;
  const entry = captionLibrary[pageUrl];
  if (!entry) return session;
  return updateSession(tabId, {
    type: 'HYDRATE_CAPTIONS_FROM_LIBRARY',
    payload: {
      pageUrl,
      captions: entry.captions
    }
  });
}

async function persistSessionLibrary(tabId: number, session: TabSession): Promise<void> {
  await ensureLibraryLoaded();
  if (!session.autoSaveLibrary || !session.pageUrl || !session.captions.cues.length) {
    return;
  }

  captionLibrary = {
    ...captionLibrary,
    [session.pageUrl]: mergeCaptionLibraryEntry(
      captionLibrary[session.pageUrl],
      session.pageUrl,
      session.pageTitle ?? session.pageUrl,
      session.captions
    )
  };
  await chrome.storage.local.set({ [CAPTION_LIBRARY_STORAGE_KEY]: captionLibrary });
}

async function deleteLibraryEntry(pageUrl: string): Promise<void> {
  await ensureLibraryLoaded();
  if (!captionLibrary[pageUrl]) return;
  const nextLibrary = { ...captionLibrary };
  delete nextLibrary[pageUrl];
  captionLibrary = nextLibrary;
  await chrome.storage.local.set({ [CAPTION_LIBRARY_STORAGE_KEY]: captionLibrary });
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown debugger error';
}

function sanitizeFilename(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 120) || 'captions';
}
