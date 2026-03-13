import { isLikelyVttRequest, parseVttCues, upsertTrack } from './subtitles';
import type { CaptionBuffer, SessionAction, TabSession } from './types';

export function createEmptySession(tabId: number, autoDetect = true): TabSession {
  return {
    tabId,
    autoDetect,
    detectionEnabled: false,
    status: 'idle',
    captions: createCaptionBuffer(),
    lastError: null
  };
}

export function reduceSessionMessage(session: TabSession, action: SessionAction): TabSession {
  switch (action.type) {
    case 'SET_AUTO_DETECT':
      return {
        ...session,
        autoDetect: action.payload.enabled
      };
    case 'START_DETECTION':
      return {
        ...session,
        detectionEnabled: true,
        status: session.captions.cues.length ? 'collecting' : 'detecting',
        lastError: null
      };
    case 'STOP_DETECTION':
      return {
        ...session,
        detectionEnabled: false,
        status: 'stopped'
      };
    case 'SET_ERROR':
      return {
        ...session,
        detectionEnabled: false,
        status: 'idle',
        lastError: action.payload.message
      };
    case 'CLEAR_CAPTIONS':
      return {
        ...session,
        captions: createCaptionBuffer()
      };
    case 'SEGMENT_CAPTURED':
      return captureSegment(session, action.payload.url, action.payload.text, action.payload.contentType);
    default:
      return session;
  }
}

function captureSegment(session: TabSession, url: string, text: string, contentType?: string): TabSession {
  if (!isLikelyVttRequest(url, contentType, text)) {
    return session;
  }

  return {
    ...session,
    captions: upsertTrack(session.captions, parseVttCues(text)),
    status: 'collecting',
    lastError: null
  };
}

function createCaptionBuffer(): CaptionBuffer {
  return {
    cues: [],
    cueMap: {},
    previewText: '',
    lastUpdatedAt: Date.now()
  };
}
