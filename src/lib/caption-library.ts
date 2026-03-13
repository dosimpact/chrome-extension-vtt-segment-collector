import { upsertTrack } from './subtitles';
import type { CaptionBuffer, CaptionLibraryEntry, CaptionLibraryMap } from './types';

export function createCaptionLibraryEntry(pageUrl: string, title: string, captions: CaptionBuffer): CaptionLibraryEntry {
  return {
    pageUrl,
    title: title || pageUrl,
    captions: cloneCaptionBuffer(captions),
    updatedAt: Date.now()
  };
}

export function mergeCaptionLibraryEntry(
  entry: CaptionLibraryEntry | undefined,
  pageUrl: string,
  title: string,
  captions: CaptionBuffer
): CaptionLibraryEntry {
  if (!entry) {
    return createCaptionLibraryEntry(pageUrl, title, captions);
  }

  return {
    ...entry,
    title: title || entry.title,
    captions: upsertTrack(entry.captions, captions.cues),
    updatedAt: Date.now()
  };
}

export function sortCaptionLibraryEntries(library: CaptionLibraryMap): CaptionLibraryEntry[] {
  return Object.values(library).sort((left, right) => right.updatedAt - left.updatedAt || left.title.localeCompare(right.title));
}

function cloneCaptionBuffer(captions: CaptionBuffer): CaptionBuffer {
  return {
    cues: [...captions.cues],
    cueMap: { ...captions.cueMap },
    previewText: captions.previewText,
    lastUpdatedAt: captions.lastUpdatedAt
  };
}
