import { cuesToTxt, cuesToVtt } from './lib/subtitles';
import { decodeDebuggerBody } from './lib/debugger-body';
import { shouldCaptureResponseBody } from './lib/debugger-network';
import { createDownloadDataUrl } from './lib/download-url';
import { createEmptySession, reduceSessionMessage } from './lib/session-store';
import type { PopupState, RuntimeMessage, TabSession } from './lib/types';

const sessions = new Map<number, TabSession>();
const debuggerTargets = new Set<number>();
const requestMap = new Map<string, { tabId: number; url: string; contentType?: string }>();
const AUTO_DETECT_STORAGE_KEY = 'autoDetectEnabled';
let autoDetectDefault = true;
let settingsLoadPromise: Promise<void> | null = null;

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(AUTO_DETECT_STORAGE_KEY);
  if (typeof stored.autoDetectEnabled !== 'boolean') {
    await chrome.storage.local.set({ [AUTO_DETECT_STORAGE_KEY]: true });
    autoDetectDefault = true;
  } else {
    autoDetectDefault = stored.autoDetectEnabled;
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
    case 'CLEAR_CAPTIONS':
      updateSession(message.payload.tabId, {
        type: 'CLEAR_CAPTIONS'
      });
      return getPopupState(message.payload.tabId);
    case 'DOWNLOAD_CAPTIONS':
      await downloadTrack(message.payload.tabId, message.payload.format);
      return getPopupState(message.payload.tabId);
    case 'VTT_SEGMENT': {
      const tabId = sender.tab?.id ?? message.payload.tabId;
      if (!tabId) return { ok: false };
      const session = getOrCreateSession(tabId);
      const autoEnabled = session.autoDetect;
      if (!session.detectionEnabled && !autoEnabled) {
        return { ok: false };
      }
      updateSession(tabId, {
        type: 'SEGMENT_CAPTURED',
        payload: {
          url: message.payload.url,
          text: message.payload.text,
          contentType: message.payload.contentType
        }
      });
      return { ok: true };
    }
    default:
      return { ok: false };
  }
}

function getPopupState(tabId: number | null): PopupState {
  if (!tabId) {
    return { tabId: null, isSupported: false, session: null };
  }

  return {
    tabId,
    isSupported: true,
    session: getOrCreateSession(tabId)
  };
}

function getOrCreateSession(tabId: number): TabSession {
  const session = sessions.get(tabId);
  if (session) return session;
  const next = createEmptySession(tabId, autoDetectDefault);
  sessions.set(tabId, next);
  return next;
}

async function ensureSettingsLoaded(): Promise<void> {
  if (!settingsLoadPromise) {
    settingsLoadPromise = chrome.storage.local
      .get(AUTO_DETECT_STORAGE_KEY)
      .then(({ autoDetectEnabled = true }) => {
        autoDetectDefault = typeof autoDetectEnabled === 'boolean' ? autoDetectEnabled : true;
      });
  }

  await settingsLoadPromise;
}

function updateSession(tabId: number, action: Parameters<typeof reduceSessionMessage>[1]): TabSession {
  const next = reduceSessionMessage(getOrCreateSession(tabId), action);
  sessions.set(tabId, next);
  return next;
}

async function downloadTrack(tabId: number, format: 'txt' | 'vtt'): Promise<void> {
  const captions = getOrCreateSession(tabId).captions;
  if (!captions.cues.length) return;
  const content = format === 'vtt' ? cuesToVtt(captions.cues) : cuesToTxt(captions.cues);
  const mimeType = format === 'vtt' ? 'text/vtt' : 'text/plain';
  const downloadUrl = createDownloadDataUrl(content, mimeType);
  await chrome.downloads.download({
    url: downloadUrl,
    filename: `captions-${tabId}.${format}`,
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
      updateSession(tabId, {
        type: 'SEGMENT_CAPTURED',
        payload: {
          url: meta.url,
          text,
          contentType: meta.contentType
        }
      });
    } catch {
      // Ignore responses whose bodies are unavailable.
    }
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown debugger error';
}
