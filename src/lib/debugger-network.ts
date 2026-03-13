export function shouldCaptureResponseBody(url: string, contentType = ''): boolean {
  const normalizedUrl = url.toLowerCase();
  const normalizedType = contentType.toLowerCase();

  if (normalizedUrl.includes('.m4s')) return false;
  if (normalizedUrl.includes('.vtt')) return true;
  if (normalizedUrl.startsWith('data:')) return true;
  if (normalizedType.includes('vtt')) return true;

  return false;
}
