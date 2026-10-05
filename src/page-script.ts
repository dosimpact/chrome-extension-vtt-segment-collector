import { decodeCapturedBody } from './lib/network-body';
import { installGlobalErrorGuards } from './lib/page-guards';

const originalFetch = window.fetch.bind(window);
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;
const RENDERED_CAPTION_SCAN_INTERVAL_MS = 500;
const observedDomCueIds = new Set<string>();

installGlobalErrorGuards(() => undefined);
installRenderedCaptionObserver();

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

function installRenderedCaptionObserver(): void {
  scanRenderedCaptionNodes(document);
  window.setInterval(() => scanRenderedCaptionNodes(document), RENDERED_CAPTION_SCAN_INTERVAL_MS);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        scanRenderedCaptionNode(mutation.target);
        continue;
      }

      for (const node of mutation.addedNodes) {
        scanRenderedCaptionNodes(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ['begin', 'end']
  });
}

function scanRenderedCaptionNodes(node: Node): void {
  scanRenderedCaptionNode(node);

  if (!isQueryableNode(node)) return;
  for (const captionNode of node.querySelectorAll('p[begin][end]')) {
    scanRenderedCaptionNode(captionNode);
  }
}

function scanRenderedCaptionNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
    scanRenderedCaptionNode(node.parentElement);
    return;
  }

  if (!(node instanceof Element) || node.tagName.toLowerCase() !== 'p') return;

  const begin = node.getAttribute('begin');
  const end = node.getAttribute('end');
  if (!begin || !end) return;

  const text = normalizeRenderedCaptionText(node.textContent ?? '');
  if (!text) return;

  const startSeconds = parseRenderedCaptionTimestamp(begin);
  const endSeconds = parseRenderedCaptionTimestamp(end);
  if (startSeconds === null || endSeconds === null || endSeconds <= startSeconds) return;

  const cueId = `${startSeconds}-${endSeconds}-${text}`;
  if (observedDomCueIds.has(cueId)) return;
  observedDomCueIds.add(cueId);

  const vtt = ['WEBVTT', '', `${formatRenderedCaptionTimestamp(startSeconds)} --> ${formatRenderedCaptionTimestamp(endSeconds)}`, text, ''].join('\n');
  emitSegment('https://vtt-collector.local/rendered-dom-captions.vtt', vtt, 'text/vtt');
}

function formatRenderedCaptionTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
}

function parseRenderedCaptionTimestamp(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(?:(\d+):)?(\d{2}):(\d{2}(?:[.,]\d+)?)$/.exec(trimmed);
  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number.parseFloat(match[3].replace(',', '.'));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function normalizeRenderedCaptionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isQueryableNode(node: Node): node is Document | DocumentFragment | Element {
  return 'querySelectorAll' in node;
}
