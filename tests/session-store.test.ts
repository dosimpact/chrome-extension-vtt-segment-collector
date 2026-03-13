import { describe, expect, it } from 'vitest';
import { createEmptySession, reduceSessionMessage } from '../src/lib/session-store';

describe('session store', () => {
  it('defaults auto detect to enabled for new sessions', () => {
    const session = createEmptySession(3);

    expect(session.autoDetect).toBe(true);
    expect(session.detectionEnabled).toBe(false);
  });

  it('collects captions immediately from any vtt segment', () => {
    const session = createEmptySession(3);
    const next = reduceSessionMessage(session, {
      type: 'SEGMENT_CAPTURED',
      payload: {
        url: 'https://example.com/subs/seg-1.vtt',
        text: `WEBVTT

00:00:01.000 --> 00:00:02.000
hello`
      }
    });

    expect(next.captions.cues.map((cue) => cue.text)).toEqual(['hello']);
    expect(next.status).toBe('collecting');
  });

  it('merges all vtt segments into a single caption buffer and clears it', () => {
    const detected = reduceSessionMessage(createEmptySession(3), {
      type: 'SEGMENT_CAPTURED',
      payload: {
        url: 'https://example.com/subs/seg-1.vtt',
        text: `WEBVTT

00:00:01.000 --> 00:00:02.000
hello`
      }
    });
    const collected = reduceSessionMessage(detected, {
      type: 'SEGMENT_CAPTURED',
      payload: {
        url: 'https://example.com/subs/seg-2.vtt',
        text: `WEBVTT

00:00:01.000 --> 00:00:02.000
hello

        00:00:02.000 --> 00:00:03.000
world`
      }
    });
    const cleared = reduceSessionMessage(collected, {
      type: 'CLEAR_CAPTIONS'
    });

    expect(collected.captions.cues.map((cue) => cue.text)).toEqual(['hello', 'world']);
    expect(collected.status).toBe('collecting');
    expect(cleared.captions.cues).toEqual([]);
  });

  it('stores runtime errors on the session and can clear them on restart', () => {
    const session = createEmptySession(3);
    const failed = reduceSessionMessage(session, {
      type: 'SET_ERROR',
      payload: { message: 'Debugger attach failed' }
    });
    const restarted = reduceSessionMessage(failed, { type: 'START_DETECTION' });

    expect(failed.lastError).toBe('Debugger attach failed');
    expect(restarted.lastError).toBeNull();
  });
});
