import { describe, expect, it } from 'vitest';
import { decodeCapturedBody } from '../src/lib/network-body';

describe('decodeCapturedBody', () => {
  it('returns plain text responses as-is', () => {
    expect(decodeCapturedBody('', 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nhello')).toBe(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nhello'
    );
  });

  it('decodes arraybuffer responses into text', () => {
    const encoded = new TextEncoder().encode('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nhello');
    expect(decodeCapturedBody('arraybuffer', encoded.buffer)).toContain('WEBVTT');
  });

  it('returns empty string for unsupported binary bodies', () => {
    expect(decodeCapturedBody('blob', new Blob(['test']))).toBe('');
  });
});
