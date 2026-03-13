import { decodeCapturedBody } from './lib/network-body';
import { installGlobalErrorGuards } from './lib/page-guards';

const originalFetch = window.fetch.bind(window);
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

installGlobalErrorGuards(() => undefined);

window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    const input = args[0];
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    void inspectResponse(url, response.clone());
    return response;
  } catch (error) {
    throw error;
  }
};

XMLHttpRequest.prototype.open = function patchedOpen(method: string, url: string | URL, ...rest: unknown[]) {
  try {
    Reflect.set(this, '__vttCollectorUrl', String(url));
    return originalXhrOpen.apply(this, [method, url, ...rest] as Parameters<XMLHttpRequest['open']>);
  } catch (error) {
    throw error;
  }
};

XMLHttpRequest.prototype.send = function patchedSend(...args: unknown[]) {
  try {
    this.addEventListener('load', () => {
      try {
        const url = Reflect.get(this, '__vttCollectorUrl');
        if (typeof url !== 'string') return;
        const contentType = this.getResponseHeader('content-type') ?? '';
        const text = decodeCapturedBody(
          this.responseType,
          this.responseType === '' || this.responseType === 'text' ? this.responseText : this.response
        );
        if (!text) return;
        emitSegment(url, text, contentType);
      } catch {}
    });
    return originalXhrSend.apply(this, args as Parameters<XMLHttpRequest['send']>);
  } catch (error) {
    throw error;
  }
};

async function inspectResponse(url: string, response: Response): Promise<void> {
  try {
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();
    emitSegment(url, text, contentType);
  } catch {
    // Ignore unreadable bodies and cross-origin edge cases.
  }
}

function emitSegment(url: string, text: string, contentType?: string): void {
  window.postMessage(
    {
      source: 'vtt-collector-page',
      type: 'VTT_SEGMENT',
      payload: { url, text, contentType }
    },
    '*'
  );
}
