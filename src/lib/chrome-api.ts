import type { PopupState, RuntimeMessage } from './types';

export async function getActiveTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id ?? null;
}

export async function sendRuntimeMessage<T>(message: RuntimeMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export async function getPopupState(): Promise<PopupState> {
  const tabId = await getActiveTabId();
  if (!tabId) {
    return { tabId: null, isSupported: false, session: null };
  }
  return sendRuntimeMessage<PopupState>({ type: 'GET_POPUP_STATE', payload: { tabId } });
}
