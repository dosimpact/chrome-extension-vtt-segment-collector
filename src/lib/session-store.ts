import { isLikelyVttRequest, parseVttCues, upsertTrack } from './subtitles';
import type { CaptionBuffer, CaptionFontSize, CaptionFontWeight, SessionAction, TabSession } from './types';

export function createEmptySession(
  tabId: number,
  autoDetect = true,
  autoSaveLibrary = true,
  domExtractionEnabled = true,
  vttResponseAnalysisEnabled = true,
  captionFontSize: CaptionFontSize = 'sm',
  captionFontWeight: CaptionFontWeight = 'normal'
): TabSession {
  return {
    tabId,
    pageUrl: null,
    pageTitle: null,
    autoDetect,
    autoSaveLibrary,
    domExtractionEnabled,
    vttResponseAnalysisEnabled,
    captionFontSize,
    captionFontWeight,
    detectionEnabled: false,
    hydratedLibraryUrl: null,
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
    case 'SET_AUTO_SAVE_LIBRARY':
      return {
        ...session,
        autoSaveLibrary: action.payload.enabled
      };
    case 'SET_DOM_EXTRACTION':
      return {
        ...session,
        domExtractionEnabled: action.payload.enabled
      };
    case 'SET_VTT_RESPONSE_ANALYSIS':
      return {
        ...session,
        vttResponseAnalysisEnabled: action.payload.enabled
      };
    case 'SET_CAPTION_DISPLAY':
      return {
        ...session,
        captionFontSize: action.payload.fontSize ?? session.captionFontSize,
        captionFontWeight: action.payload.fontWeight ?? session.captionFontWeight
      };
    case 'SET_PAGE_CONTEXT':
      return setPageContext(session, action.payload.pageUrl, action.payload.pageTitle);
    case 'HYDRATE_CAPTIONS_FROM_LIBRARY':
      return hydrateCaptionsFromLibrary(session, action.payload.pageUrl, action.payload.captions);
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

function setPageContext(session: TabSession, pageUrl: string | null, pageTitle: string | null): TabSession {
  if (session.pageUrl === pageUrl) {
    return {
      ...session,
      pageTitle
    };
  }

  return {
    ...session,
    pageUrl,
    pageTitle,
    hydratedLibraryUrl: null,
    captions: createCaptionBuffer(),
    status: 'idle',
    lastError: null
  };
}

function hydrateCaptionsFromLibrary(session: TabSession, pageUrl: string, captions: CaptionBuffer): TabSession {
  if (session.pageUrl !== pageUrl || session.hydratedLibraryUrl === pageUrl) {
    return session;
  }

  const mergedCaptions = upsertTrack(session.captions, captions.cues);

  return {
    ...session,
    captions: mergedCaptions,
    hydratedLibraryUrl: pageUrl,
    status: mergedCaptions.cues.length ? 'ready' : session.status
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
