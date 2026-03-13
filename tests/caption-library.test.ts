import { describe, expect, it } from 'vitest';
import { createCaptionLibraryEntry, mergeCaptionLibraryEntry, sortCaptionLibraryEntries } from '../src/lib/caption-library';
import type { CaptionBuffer } from '../src/lib/types';

function createBuffer(cues: CaptionBuffer['cues']): CaptionBuffer {
  return {
    cues,
    cueMap: Object.fromEntries(cues.map((cue) => [cue.id, true])),
    previewText: cues[0]?.text ?? '',
    lastUpdatedAt: 1
  };
}

describe('caption library', () => {
  it('merges saved and incoming cues while keeping time order', () => {
    const existing = createCaptionLibraryEntry(
      'https://example.com/watch/1',
      'Example',
      createBuffer([{ id: '2-3-world', start: 2, end: 3, text: 'world' }])
    );

    const merged = mergeCaptionLibraryEntry(
      existing,
      'https://example.com/watch/1',
      'Example',
      createBuffer([
        { id: '1-2-hello', start: 1, end: 2, text: 'hello' },
        { id: '2-3-world', start: 2, end: 3, text: 'world' }
      ])
    );

    expect(merged.captions.cues.map((cue) => cue.text)).toEqual(['hello', 'world']);
  });

  it('sorts library entries by most recently updated first', () => {
    const older = {
      ...createCaptionLibraryEntry('https://example.com/watch/1', 'Older', createBuffer([])),
      updatedAt: 10
    };
    const newer = {
      ...createCaptionLibraryEntry('https://example.com/watch/2', 'Newer', createBuffer([])),
      updatedAt: 20
    };

    expect(sortCaptionLibraryEntries({ [older.pageUrl]: older, [newer.pageUrl]: newer }).map((entry) => entry.title)).toEqual([
      'Newer',
      'Older'
    ]);
  });
});

