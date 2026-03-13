import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../lib/chrome-api';
import { cuesToTxt } from '../lib/subtitles';
import type { DownloadFormat, PopupState } from '../lib/types';
import { PopupApp } from './PopupApp';
import './styles.css';

const fallbackState: PopupState = {
  tabId: null,
  isSupported: false,
  session: null
};

function App() {
  const [state, setState] = useState<PopupState>(fallbackState);

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
      onStart={() => void startDetection()}
      onStop={() => void stopDetection()}
      onToggleAutoDetect={(enabled) => void toggleAutoDetect(enabled)}
      onClearCaptions={() => void clearCaptions()}
      onCopyAll={() => void copyAllCaptions()}
      onDownload={(format) => void sendDownload(format)}
      onRefresh={() => void refresh()}
    />
  );

  async function sendDownload(format: DownloadFormat) {
    if (!state.tabId) return;
    const next = await sendRuntimeMessage<PopupState>({
      type: 'DOWNLOAD_CAPTIONS',
      payload: { tabId: state.tabId, format }
    });
    setState(next);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
