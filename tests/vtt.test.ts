import { describe, expect, it } from 'vitest';
import { isLikelyVttRequest, parseVttCues, upsertTrack } from '../src/lib/subtitles';
import type { CaptionBuffer } from '../src/lib/types';

describe('isLikelyVttRequest', () => {
  it('accepts vtt url with query string', () => {
    expect(
      isLikelyVttRequest('https://example.com/subtitles/seg-001.vtt?token=abc', 'text/vtt', 'WEBVTT')
    ).toBe(true);
  });

  it('rejects m4s media segments', () => {
    expect(isLikelyVttRequest('https://example.com/video/seg-001.m4s', 'video/iso.segment', '')).toBe(false);
  });

  it('rejects vtt-looking url when body is not webvtt', () => {
    expect(isLikelyVttRequest('https://example.com/subtitles/seg-001.vtt', 'text/plain', 'not a subtitle')).toBe(false);
  });

  it('accepts data url with embedded webvtt payload', () => {
    const dataUrl =
      'data:application/octet-stream;base64,V0VCVlRUCgowMDowMDowMS4wMDAgLS0+IDAwOjAwOjAyLjAwMApoZWxsbw==';

    expect(isLikelyVttRequest(dataUrl, 'application/octet-stream', '')).toBe(true);
  });
});

describe('parseVttCues', () => {
  it('parses cues and strips duplicate entries across segments', () => {
    const cues = parseVttCues(`WEBVTT

00:00:01.000 --> 00:00:02.000
hello

00:00:02.000 --> 00:00:03.000
world`);

    expect(cues).toEqual([
      { id: '1-2-hello', start: 1, end: 2, text: 'hello' },
      { id: '2-3-world', start: 2, end: 3, text: 'world' }
    ]);
  });
});

describe('upsertTrack', () => {
  it('keeps cues sorted, unique, and records preview text', () => {
    const initial: CaptionBuffer = {
      cues: [],
      cueMap: {},
      previewText: '',
      lastUpdatedAt: 0
    };

    const next = upsertTrack(initial, [
      { id: '2-3-world', start: 2, end: 3, text: 'world' },
      { id: '1-2-hello', start: 1, end: 2, text: 'hello' },
      { id: '2-3-world', start: 2, end: 3, text: 'world' }
    ]);

    expect(next.cues.map((cue) => cue.text)).toEqual(['hello', 'world']);
    expect(next.previewText).toBe('hello');
    expect(next.lastUpdatedAt).toBeGreaterThan(0);
  });
});
