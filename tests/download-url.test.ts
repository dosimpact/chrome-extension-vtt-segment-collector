import { describe, expect, it } from 'vitest';
import { createDownloadDataUrl } from '../src/lib/download-url';

describe('createDownloadDataUrl', () => {
  it('creates a text/vtt data url with utf-8 payload', () => {
    const url = createDownloadDataUrl('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n시장', 'text/vtt');

    expect(url.startsWith('data:text/vtt;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(url.split(',', 2)[1])).toContain('시장');
  });

  it('creates a plain text data url for txt exports', () => {
    const url = createDownloadDataUrl('line one\nline two', 'text/plain');

    expect(url.startsWith('data:text/plain;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(url.split(',', 2)[1])).toBe('line one\nline two');
  });
});
