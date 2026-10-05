function sanitizeFilename(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 120) || 'captions';
}

export function createCaptionFilenameBase(pageUrl: string | null, fallback?: string | null): string {
  if (pageUrl) {
    try {
      const url = new URL(pageUrl);
      const host = url.hostname.replace(/^www\./, '');
      const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+/g, '_');
      const query = url.searchParams.toString() ? `_${url.searchParams.toString().replace(/[=&]+/g, '_')}` : '';
      return sanitizeFilename(`${host}${path}${query}`);
    } catch {
      // Fall back to the generic sanitizer below.
    }
  }

  if (fallback) {
    return sanitizeFilename(fallback);
  }

  return 'captions';
}
