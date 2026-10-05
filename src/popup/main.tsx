import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../lib/chrome-api';
import { cuesToTxt } from '../lib/subtitles';
import type { CaptionFontSize, CaptionFontWeight, DownloadFormat, PopupState } from '../lib/types';
import { PopupApp } from './PopupApp';
import './styles.css';

const fallbackState: PopupState = {
  tabId: null,
  isSupported: false,
  session: null,
  library: []
};

function App() {
  const [state, setState] = useState<PopupState>(fallbackState);
  const isSidePanel = window.location.pathname.endsWith('sidepanel.html');
  const canOpenSidePanel = !isSidePanel && typeof chrome.sidePanel?.open === 'function';

  async function refresh() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id ?? null;
    if (!tabId) {
      setState(fallbackState);
      return;
    }
    const next = (await sendRuntimeMessage<PopupState>({
      type: 'GET_POPUP_STATE',
      payload: { tabId }
    })) ?? fallbackState;
    setState(next);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 1000);

    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function startDetection() {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'START_DETECTION',
        payload: { tabId: state.tabId }
      })
    );
  }

  async function stopDetection() {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'STOP_DETECTION',
        payload: { tabId: state.tabId }
      })
    );
  }

  async function toggleAutoDetect(enabled: boolean) {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'SET_AUTO_DETECT',
        payload: { tabId: state.tabId, enabled }
      })
    );
  }

  async function toggleAutoSaveLibrary(enabled: boolean) {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'SET_AUTO_SAVE_LIBRARY',
        payload: { tabId: state.tabId, enabled }
      })
    );
  }

  async function toggleDomExtraction(enabled: boolean) {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'SET_DOM_EXTRACTION',
        payload: { tabId: state.tabId, enabled }
      })
    );
  }

  async function toggleVttResponseAnalysis(enabled: boolean) {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'SET_VTT_RESPONSE_ANALYSIS',
        payload: { tabId: state.tabId, enabled }
      })
    );
  }

  async function setCaptionDisplay(payload: { fontSize?: CaptionFontSize; fontWeight?: CaptionFontWeight }) {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'SET_CAPTION_DISPLAY',
        payload: { tabId: state.tabId, ...payload }
      })
    );
  }

  async function clearCaptions() {
    if (!state.tabId) return;
    setState(
      await sendRuntimeMessage<PopupState>({
        type: 'CLEAR_CAPTIONS',
        payload: { tabId: state.tabId }
      })
    );
  }

  async function copyAllCaptions() {
    const cues = state.session?.captions.cues ?? [];
    if (!cues.length) return;

    const text = cuesToTxt(cues);

    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  return (
    <PopupApp
      state={state}
      isSidePanel={isSidePanel}
      canOpenSidePanel={canOpenSidePanel}
      onStart={() => void startDetection()}
      onStop={() => void stopDetection()}
      onOpenSidePanel={() => void openSidePanel()}
      onToggleAutoDetect={(enabled) => void toggleAutoDetect(enabled)}
      onToggleAutoSaveLibrary={(enabled) => void toggleAutoSaveLibrary(enabled)}
      onToggleDomExtraction={(enabled) => void toggleDomExtraction(enabled)}
      onToggleVttResponseAnalysis={(enabled) => void toggleVttResponseAnalysis(enabled)}
      onSetCaptionDisplay={(payload) => void setCaptionDisplay(payload)}
      onClearCaptions={() => void clearCaptions()}
      onCopyAll={() => void copyAllCaptions()}
      onDownload={(format) => void sendDownload(format)}
      onDownloadLibrary={(pageUrl, format) => void sendLibraryDownload(pageUrl, format)}
      onDownloadAllLibrary={(format) => void sendAllLibraryDownload(format)}
      onDeleteLibraryEntry={(pageUrl) => void deleteLibraryEntry(pageUrl)}
      onRefresh={() => void refresh()}
    />
  );

  async function openSidePanel() {
    if (isSidePanel) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.windowId) return;
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  }

  async function sendDownload(format: DownloadFormat) {
    if (!state.tabId) return;
    const next = await sendRuntimeMessage<PopupState>({
      type: 'DOWNLOAD_CAPTIONS',
      payload: { tabId: state.tabId, format }
    });
    setState(next);
  }

  async function sendLibraryDownload(pageUrl: string, format: DownloadFormat) {
    const next = await sendRuntimeMessage<PopupState>({
      type: 'DOWNLOAD_LIBRARY_CAPTIONS',
      payload: { pageUrl, format }
    });
    setState(next);
  }

  async function sendAllLibraryDownload(format: DownloadFormat) {
    const next = await sendRuntimeMessage<PopupState>({
      type: 'DOWNLOAD_ALL_LIBRARY_CAPTIONS',
      payload: { format }
    });
    setState(next);
  }

  async function deleteLibraryEntry(pageUrl: string) {
    const next = await sendRuntimeMessage<PopupState>({
      type: 'DELETE_LIBRARY_CAPTIONS',
      payload: { pageUrl }
    });
    setState(next);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
