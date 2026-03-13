export {};

declare global {
  interface Window {
    __vttCollectorInjected?: boolean;
  }
}

if (!window.__vttCollectorInjected) {
  window.__vttCollectorInjected = true;
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('page-script.js');
  script.dataset.extension = 'vtt-collector';
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => {
    script.remove();
  };
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'vtt-collector-page' || data.type !== 'VTT_SEGMENT') return;

  try {
    void chrome.runtime
      .sendMessage({
        type: 'VTT_SEGMENT',
        payload: {
          url: data.payload.url,
          text: data.payload.text,
          contentType: data.payload.contentType
        }
      })
      .catch(() => undefined);
  } catch {
    // Ignore stale content scripts after extension reload.
  }
});
