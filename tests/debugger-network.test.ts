import { describe, expect, it } from 'vitest';
import { shouldCaptureResponseBody } from '../src/lib/debugger-network';

describe('shouldCaptureResponseBody', () => {
  it('captures vtt urls', () => {
    expect(shouldCaptureResponseBody('https://example.com/subs/seg-100_init.vtt', 'text/vtt')).toBe(true);
  });

  it('captures data urls with octet-stream content type', () => {
    expect(shouldCaptureResponseBody('data:application/octet-stream;base64,V0VCVlRU', 'application/octet-stream')).toBe(true);
  });

  it('rejects m4s media segments', () => {
    expect(shouldCaptureResponseBody('https://example.com/video/seg-100.m4s', 'video/iso.segment')).toBe(false);
  });
});
