export function createDownloadDataUrl(content: string, mimeType: 'text/plain' | 'text/vtt'): string {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}
