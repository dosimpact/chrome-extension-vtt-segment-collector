import { describe, expect, it } from 'vitest';
import { cuesToTxt, isLikelyVttRequest, normalizeCueText, parseVttCues, upsertTrack } from '../src/lib/subtitles';
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

  it('repairs mojibake subtitle text before storing cues', () => {
    const cues = parseVttCues(`WEBVTT

00:00:58.058 --> 00:01:00.427 align:center
ìŠ¤íƒœê·¸í”Œë ˆì´ì…˜ì˜ ë«ì— ë¹ ì§€ê²Œ ë˜ì£ `);

    expect(cues).toEqual([
      {
        id: '58.058-60.427-스태그플레이션의 덫에 빠지게 되죠',
        start: 58.058,
        end: 60.427,
        text: '스태그플레이션의 덫에 빠지게 되죠'
      }
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

  it('normalizes previously broken cues when merging tracks', () => {
    const initial: CaptionBuffer = {
      cues: [{ id: '1-2-broken', start: 1, end: 2, text: 'ìŠ¤íƒœê·¸í”Œë ˆì´ì…˜' }],
      cueMap: { '1-2-broken': true },
      previewText: 'ìŠ¤íƒœê·¸í”Œë ˆì´ì…˜',
      lastUpdatedAt: 0
    };

    const next = upsertTrack(initial, []);

    expect(next.cues[0]?.text).toBe('스태그플레이션');
    expect(next.previewText).toBe('스태그플레이션');
  });
});

describe('normalizeCueText', () => {
  it('leaves already-correct text unchanged and repairs exported text', () => {
    expect(normalizeCueText('정상 자막')).toBe('정상 자막');
    expect(cuesToTxt([{ id: '1', start: 1, end: 2, text: 'ì¼€ì¸ìŠ¤ì£¼ì˜ ê²½ì œí•™' }])).toBe('케인스주의 경제학');
  });
});
